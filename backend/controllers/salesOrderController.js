const SalesOrder = require("../models/salesOrder")
const Product = require("../models/product")
const { InventoryTransaction } = require("../models/inventory")

// ====================================
// GET ALL SALES ORDERS
// ====================================
const getSalesOrders = async (req, res) => {
  try {
    const { status, customer_name, page = 1, limit = 10 } = req.query
    
    // Build query
    let query = {}
    if (status) query.status = status
    if (customer_name) {
      query['customer_info.name'] = { $regex: customer_name, $options: 'i' }
    }
    
    const skip = (page - 1) * parseInt(limit)
    
    const orders = await SalesOrder.find(query)
      .populate("items.product_id", "name sku category")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
    
    const total = await SalesOrder.countDocuments(query)
    
    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_records: total,
        per_page: parseInt(limit)
      }
    })
  } catch (error) {
    console.error("❌ Error fetching sales orders:", error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// ====================================
// GET SINGLE SALES ORDER
// ====================================
const getSalesOrderById = async (req, res) => {
  try {
    const { id } = req.params
    
    const order = await SalesOrder.findById(id)
      .populate("items.product_id", "name sku category current_stock")
    
    if (!order) {
      return res.status(404).json({ success: false, message: "Sales order not found" })
    }
    
    res.status(200).json({ success: true, data: order })
  } catch (error) {
    console.error("❌ Error fetching sales order:", error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// ====================================
// CREATE NEW SALES ORDER
// ====================================
const createSalesOrder = async (req, res) => {
  try {
    const { customer_info, items, payment_method, notes, discount_amount = 0, tax_amount = 0 } = req.body
    
    // Validate required fields
    if (!customer_info?.name || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Customer name and at least one item are required"
      })
    }
    
    // Validate stock availability for all items
    const stockChecks = await Promise.all(
      items.map(async (item) => {
        const product = await Product.findById(item.product_id)
        if (!product) {
          throw new Error(`Product not found: ${item.product_id}`)
        }
        if (product.current_stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}. Available: ${product.current_stock}, Requested: ${item.quantity}`)
        }
        return {
          product,
          item: {
            ...item,
            product_name: product.name,
            unit_price: item.unit_price || product.selling_price
          }
        }
      })
    )
    
    // Prepare order data
    const orderData = {
      customer_info,
      items: stockChecks.map(({ item }) => item),
      payment_method,
      notes,
      discount_amount,
      tax_amount,
      created_by: req.user?.name || "USER"
    }
    
    const order = new SalesOrder(orderData)
    await order.save()
    
    // Populate product details for response
    await order.populate("items.product_id", "name sku category")
    
    console.log(`✅ Sales order created: ${order.order_number}`)
    
    res.status(201).json({
      success: true,
      message: `Sales order ${order.order_number} created successfully`,
      data: order
    })
  } catch (error) {
    console.error("❌ Error creating sales order:", error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// ====================================
// UPDATE SALES ORDER STATUS
// ====================================
const updateSalesOrderStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status, payment_status } = req.body
    
    const order = await SalesOrder.findById(id).populate("items.product_id")
    
    if (!order) {
      return res.status(404).json({ success: false, message: "Sales order not found" })
    }
    
    const oldStatus = order.status
    
    // Update status
    if (status) order.status = status
    if (payment_status) order.payment_status = payment_status
    
    // If completing the order, update inventory and set completion date
    if (status === "COMPLETED" && oldStatus !== "COMPLETED") {
      // Check stock availability again
      for (const item of order.items) {
        const product = await Product.findById(item.product_id)
        if (product.current_stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.name}. Available: ${product.current_stock}, Required: ${item.quantity}`
          })
        }
      }
      
      // Update product stock and create inventory transactions
      for (const item of order.items) {
        const product = await Product.findById(item.product_id)
        
        // Reduce stock
        product.current_stock -= item.quantity
        await product.save()
        
        // Create inventory transaction
        const transaction = new InventoryTransaction({
          product_id: item.product_id,
          transaction_type: "SALE",
          quantity_changed: -item.quantity,
          reason: `Sale - Order ${order.order_number}`,
          reference_id: order._id,
          reference_type: "SALES_ORDER",
          performed_by: req.user?.name || "USER"
        })
        await transaction.save()
        
        console.log(`📦 Stock reduced for ${product.name}: -${item.quantity} units`)
      }
      
      order.completed_date = new Date()
      console.log(`✅ Sales order ${order.order_number} completed - inventory updated`)
    }
    
    await order.save()
    await order.populate("items.product_id", "name sku category")
    
    res.status(200).json({
      success: true,
      message: `Sales order ${order.order_number} updated successfully`,
      data: order
    })
  } catch (error) {
    console.error("❌ Error updating sales order:", error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// ====================================
// DELETE/CANCEL SALES ORDER
// ====================================
const cancelSalesOrder = async (req, res) => {
  try {
    const { id } = req.params
    
    const order = await SalesOrder.findById(id)
    
    if (!order) {
      return res.status(404).json({ success: false, message: "Sales order not found" })
    }
    
    if (order.status === "COMPLETED") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel completed orders"
      })
    }
    
    order.status = "CANCELLED"
    await order.save()
    
    console.log(`❌ Sales order ${order.order_number} cancelled`)
    
    res.status(200).json({
      success: true,
      message: `Sales order ${order.order_number} cancelled successfully`,
      data: order
    })
  } catch (error) {
    console.error("❌ Error cancelling sales order:", error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// ====================================
// GET SALES ANALYTICS
// ====================================
const getSalesOrderAnalytics = async (req, res) => {
  try {
    const { start_date, end_date } = req.query
    
    let dateFilter = {}
    if (start_date && end_date) {
      dateFilter = {
        createdAt: {
          $gte: new Date(start_date),
          $lte: new Date(end_date)
        }
      }
    }
    
    // Total completed orders
    const totalOrders = await SalesOrder.countDocuments({
      ...dateFilter,
      status: "COMPLETED"
    })
    
    // Total revenue from completed orders
    const revenueResult = await SalesOrder.aggregate([
      { $match: { ...dateFilter, status: "COMPLETED" } },
      { $group: { _id: null, total_revenue: { $sum: "$total_amount" } } }
    ])
    
    const totalRevenue = revenueResult[0]?.total_revenue || 0
    
    // Average order value
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    
    // Orders by status
    const ordersByStatus = await SalesOrder.aggregate([
      { $match: dateFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ])
    
    // Top selling products
    const topProducts = await SalesOrder.aggregate([
      { $match: { ...dateFilter, status: "COMPLETED" } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product_id",
          product_name: { $first: "$items.product_name" },
          total_quantity: { $sum: "$items.quantity" },
          total_revenue: { $sum: "$items.subtotal" }
        }
      },
      { $sort: { total_quantity: -1 } },
      { $limit: 10 }
    ])
    
    res.status(200).json({
      success: true,
      data: {
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        average_order_value: averageOrderValue,
        orders_by_status: ordersByStatus,
        top_selling_products: topProducts
      }
    })
  } catch (error) {
    console.error("❌ Error fetching sales analytics:", error)
    res.status(500).json({ success: false, message: error.message })
  }
}

module.exports = {
  getSalesOrders,
  getSalesOrderById,
  createSalesOrder,
  updateSalesOrderStatus,
  cancelSalesOrder,
  getSalesOrderAnalytics
}