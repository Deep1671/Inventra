const SalesOrder = require("../models/salesOrder")
const Sale = require("../models/sale")
const Product = require("../models/product")
const { InventoryTransaction } = require("../models/inventory")
const emailService = require("../services/emailService")
const mongoose = require("mongoose")

// ====================================
// UNIFIED SALES CONTROLLER
// Handles both single-item and multi-item sales
// ====================================

// ====================================
// GET ALL SALES (Unified View)
// ====================================
const getAllSales = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, customer_name, order_type } = req.query
    
    // Build query for SalesOrders
    let query = {}
    if (status) query.status = status
    if (customer_name) {
      query['customer_info.name'] = { $regex: customer_name, $options: 'i' }
    }
    if (order_type === 'single') query.is_single_item = true
    if (order_type === 'multi') query.is_single_item = { $ne: true }
    
    const skip = (page - 1) * parseInt(limit)
    
    // Get unified sales orders (includes migrated single sales)
    const salesOrders = await SalesOrder.find(query)
      .populate("items.product_id", "name sku category")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
    
    const total = await SalesOrder.countDocuments(query)
    
    // Format response with unified structure
    const unifiedSales = salesOrders.map(order => ({
      _id: order._id,
      order_number: order.order_number,
      customer_name: order.customer_info.name,
      customer_info: order.customer_info,
      items: order.items,
      total_amount: order.total_amount,
      status: order.status,
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      order_date: order.order_date,
      completed_date: order.completed_date,
      is_single_item: order.is_single_item || false,
      notes: order.notes,
      createdAt: order.createdAt,
      type: order.is_single_item ? 'Quick Sale' : 'Sales Order'
    }))
    
    res.status(200).json({
      success: true,
      data: unifiedSales,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_records: total,
        per_page: parseInt(limit)
      }
    })
  } catch (error) {
    console.error("❌ Error fetching unified sales:", error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// ====================================
// CREATE QUICK SALE (Single Item)
// ====================================
const createQuickSale = async (req, res) => {
  try {
    const { product_id, quantity_sold, customer_name = "Walk-in Customer", payment_method = "CASH" } = req.body
    
    // Validate required fields
    if (!product_id || !quantity_sold) {
      return res.status(400).json({
        success: false,
        message: "Product ID and quantity are required"
      })
    }
    
    // Check product and stock
    const product = await Product.findById(product_id)
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      })
    }
    
    if (product.current_stock < quantity_sold) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${product.current_stock}, Requested: ${quantity_sold}`
      })
    }
    
    // Calculate revenue using selling price
    const unitPrice = product.selling_price || 0
    const totalRevenue = quantity_sold * unitPrice
    
    // Generate unique order number
    const orderNumber = `QS-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    // Create as single-item sales order
    const quickSaleOrder = new SalesOrder({
      order_number: orderNumber,
      customer_info: {
        name: customer_name,
        email: "",
        phone: "",
        address: ""
      },
      items: [{
        product_id: product._id,
        product_name: product.name,
        quantity: quantity_sold,
        unit_price: unitPrice,
        subtotal: totalRevenue
      }],
      total_amount: totalRevenue,
      status: "COMPLETED", // Quick sales are immediately completed
      payment_method,
      payment_status: "PAID",
      order_date: new Date(),
      completed_date: new Date(),
      created_by: req.user?.name || "USER",
      is_single_item: true, // Mark as single item sale
      notes: "Quick Sale"
    })
    
    await quickSaleOrder.save()
    
    // Update inventory
    product.current_stock -= quantity_sold
    await product.save()
    
    // Get user ID or create a system user placeholder
    const userId = req.user?._id || new mongoose.Types.ObjectId('000000000000000000000000');
    
    // Create inventory transaction
    const transaction = new InventoryTransaction({
      product_id: product._id,
      product_name: product.name,
      transaction_type: "SALE",
      quantity_change: -quantity_sold,
      quantity_before: product.current_stock + quantity_sold,
      quantity_after: product.current_stock,
      reason: `Quick Sale - Order ${quickSaleOrder.order_number}`,
      reference_id: quickSaleOrder._id,
      reference_type: "Sale",
      created_by: userId,
      notes: "Quick Sale Transaction"
    })
    await transaction.save()
    console.log(`📊 Inventory transaction created:`, {
      product_name: product.name,
      quantity_change: -quantity_sold,
      quantity_before: product.current_stock + quantity_sold,
      quantity_after: product.current_stock
    })
    
    // Populate for response
    await quickSaleOrder.populate("items.product_id", "name sku category")
    
    // Send notifications if emails enabled
    if (process.env.SEND_EMAILS === 'true') {
      try {
        // Send completion notification if customer email provided
        if (customer_name !== "Walk-in Customer" && customer_name.includes('@')) {
          // If customer name looks like an email, send notification
          const quickSaleEmail = emailService.generateSalesOrderConfirmationEmail(quickSaleOrder);
          await emailService.sendEmail(
            customer_name,
            `Quick Sale Receipt - ${quickSaleOrder.order_number}`,
            quickSaleEmail
          );
          console.log(`📧 Quick sale receipt sent to ${customer_name}`);
        }
        
        // Check if item is now low stock and alert admin
        if (product.current_stock <= product.reorder_point && process.env.ADMIN_EMAIL) {
          const lowStockAlert = emailService.generateOrderLowStockAlert(quickSaleOrder, [{
            product_name: product.name,
            ordered_quantity: quantity_sold,
            remaining_stock: product.current_stock,
            reorder_point: product.reorder_point
          }]);
          
          await emailService.sendEmail(
            process.env.ADMIN_EMAIL,
            `🚨 Low Stock Alert - ${product.name}`,
            lowStockAlert
          );
          console.log(`⚠️ Low stock alert sent for ${product.name}`);
        }
        
      } catch (emailError) {
        console.error("❌ Error sending quick sale notifications:", emailError.message);
      }
    }
    
    console.log(`✅ Quick sale created: ${quickSaleOrder.order_number}`)
    
    res.status(201).json({
      success: true,
      message: `Quick sale completed! Order: ${quickSaleOrder.order_number}`,
      data: quickSaleOrder
    })
  } catch (error) {
    console.error("❌ Error creating quick sale:", error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// ====================================
// CREATE MULTI-ITEM SALES ORDER
// ====================================
const createSalesOrder = async (req, res) => {
  try {
    const { customer_info, items, payment_method = "CASH", notes = "", discount_amount = 0, tax_amount = 0 } = req.body
    
    // Validate required fields
    if (!customer_info?.name || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Customer name and at least one item are required"
      })
    }
    
    // Mark as multi-item if more than one item
    const isMultiItem = items.length > 1
    
    // Validate stock availability
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
    
    // Calculate total amount and subtotals
    let totalAmount = 0;
    const processedItems = stockChecks.map(({ item, product }) => {
      const subtotal = item.quantity * (item.unit_price || product.selling_price);
      totalAmount += subtotal;
      return {
        ...item,
        product_name: product.name,
        unit_price: item.unit_price || product.selling_price,
        subtotal: subtotal
      };
    });

    // Generate unique order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    // Create sales order
    const orderData = {
      order_number: orderNumber,
      customer_info,
      items: processedItems,
      total_amount: totalAmount + tax_amount - discount_amount,
      payment_method,
      notes,
      discount_amount,
      tax_amount,
      created_by: req.user?.name || "USER",
      is_single_item: !isMultiItem,
      status: "DRAFT", // Multi-item orders start as draft for review
      order_date: new Date(),
      payment_status: "PENDING"
    }
    
    const salesOrder = new SalesOrder(orderData)
    await salesOrder.save()
    
    await salesOrder.populate("items.product_id", "name sku category")
    
    // Send notifications if emails enabled
    if (process.env.SEND_EMAILS === 'true') {
      try {
        console.log(`ℹ️ Order created - email notifications will be sent when order is confirmed`);
        
        // Check for low stock items and alert admin (immediate alert for stock management)
        const lowStockItems = [];
        for (const item of salesOrder.items) {
          const product = await Product.findById(item.product_id);
          const remainingStock = product.current_stock - item.quantity;
          
          if (remainingStock <= product.reorder_point) {
            lowStockItems.push({
              product_name: item.product_name,
              ordered_quantity: item.quantity,
              remaining_stock: remainingStock,
              reorder_point: product.reorder_point
            });
          }
        }
        
        // Send low stock alert to admin if needed (immediate for business operations)
        if (lowStockItems.length > 0 && process.env.ADMIN_EMAIL) {
          const lowStockAlert = emailService.generateOrderLowStockAlert(salesOrder, lowStockItems);
          await emailService.sendEmail(
            process.env.ADMIN_EMAIL,
            `🚨 Low Stock Alert - Order ${salesOrder.order_number}`,
            lowStockAlert
          );
          console.log(`⚠️ Low stock alert sent to admin for ${lowStockItems.length} items`);
        }
        
        // Note: Customer order confirmation will be sent when order is CONFIRMED (not at creation)
        console.log(`ℹ️ Customer will receive order confirmation when order status changes to CONFIRMED`);
        
      } catch (emailError) {
        console.error("❌ Error sending notifications:", emailError.message);
        // Don't fail the order creation if email fails
      }
    }
    
    console.log(`✅ Sales order created: ${salesOrder.order_number} (${isMultiItem ? 'Multi-item' : 'Single-item'})`)
    
    res.status(201).json({
      success: true,
      message: `Sales order ${salesOrder.order_number} created successfully`,
      data: salesOrder
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
    
    console.log(`📝 Updating order ${id}:`, { status, payment_status });
    
    const order = await SalesOrder.findById(id).populate("items.product_id")
    
    if (!order) {
      return res.status(404).json({ success: false, message: "Sales order not found" })
    }
    
    const oldStatus = order.status
    console.log(`📋 Current order status: ${oldStatus} → ${status}`);
    
    // Update status
    if (status) {
      order.status = status
      console.log(`✅ Status updated to: ${order.status}`);
    }
    if (payment_status) {
      order.payment_status = payment_status
      console.log(`💳 Payment status updated to: ${order.payment_status}`);
    }
    
    // Handle inventory updates when completing order
    if (status === "COMPLETED" && oldStatus !== "COMPLETED") {
      // Validate stock again
      for (const item of order.items) {
        const product = await Product.findById(item.product_id)
        if (product.current_stock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for ${product.name}. Available: ${product.current_stock}, Required: ${item.quantity}`
          })
        }
      }
      
      // Update inventory
      for (const item of order.items) {
        const product = await Product.findById(item.product_id)
        
        // Reduce stock
        product.current_stock -= item.quantity
        await product.save()
        
          // Get user ID or create a system user placeholder
          const userId = req.user?._id || new mongoose.Types.ObjectId('000000000000000000000000');
          
          // Create transaction
          const transaction = new InventoryTransaction({
            product_id: item.product_id,
            product_name: item.product_name,
            transaction_type: "SALE",
            quantity_change: -item.quantity,
            quantity_before: product.current_stock + item.quantity,
            quantity_after: product.current_stock,
            reason: `Sale - Order ${order.order_number}`,
            reference_id: order._id,
            reference_type: "Sale",
            created_by: userId,
            notes: order.is_single_item ? "Quick Sale" : "Multi-item Sale Order"
          })
        await transaction.save()
        console.log(`📊 Inventory transaction created:`, {
          product_name: item.product_name,
          quantity_change: -item.quantity,
          quantity_before: product.current_stock + item.quantity,
          quantity_after: product.current_stock
        })
      }
      
      order.completed_date = new Date()
      console.log(`📅 Completion date set: ${order.completed_date}`);
      
      if (payment_status !== "PAID") {
        order.payment_status = "PAID" // Auto-mark as paid when completed
        console.log(`💳 Auto-marked as PAID on completion`);
      }
    }
    
    console.log(`💾 Saving order with status: ${order.status}`);
    await order.save()
    console.log(`✅ Order saved successfully`);
    
    await order.populate("items.product_id", "name sku category")
    
    console.log(`📤 Sending response with updated order data`);
    
    res.status(200).json({
      success: true,
      message: `Order ${order.order_number} updated successfully`,
      data: order
    })
    
    // Send status update notifications if emails enabled (async, don't wait)
    if (process.env.SEND_EMAILS === 'true') {
      try {
        // Send order confirmation to customer when order is CONFIRMED
        if (status === 'CONFIRMED' && oldStatus !== 'CONFIRMED' && order.customer_info.email) {
          const confirmationEmail = emailService.generateSalesOrderConfirmationEmail(order);
          await emailService.sendEmail(
            order.customer_info.email,
            `Order Confirmation - ${order.order_number}`,
            confirmationEmail
          );
          console.log(`📧 Order confirmation sent to ${order.customer_info.email} (on confirmation)`);
        }
        
        // Send status update email to customer for important status changes only
        if (order.customer_info.email && status && status !== oldStatus && ['COMPLETED', 'CANCELLED'].includes(status)) {
          const statusUpdateEmail = emailService.generateSalesOrderStatusUpdateEmail(order, oldStatus, status);
          await emailService.sendEmail(
            order.customer_info.email,
            `Order Update: ${order.order_number} - ${status}`,
            statusUpdateEmail
          );
          console.log(`📧 Status update email sent to ${order.customer_info.email} (${oldStatus} → ${status})`);
        } else if (status && status !== oldStatus && ['PROCESSING'].includes(status)) {
          console.log(`ℹ️ Skipping email for ${oldStatus} → ${status} (processing notification disabled)`);
        } else if (!order.customer_info.email && status !== oldStatus) {
          console.log(`ℹ️ No customer email - skipping status update notification for ${oldStatus} → ${status}`);
        }
        
        // Send admin notification ONLY for critical status changes (completed/cancelled)
        // and only if specifically needed for business operations
        if (process.env.ADMIN_EMAIL && status && ['COMPLETED', 'CANCELLED'].includes(status) && process.env.ADMIN_ORDER_NOTIFICATIONS === 'true') {
          const adminUpdateEmail = `
            <h2>📱 Critical Order Status Update</h2>
            <p><strong>Order:</strong> ${order.order_number}</p>
            <p><strong>Customer:</strong> ${order.customer_info.name}</p>
            <p><strong>Status Change:</strong> ${oldStatus} → ${status}</p>
            <p><strong>Total Amount:</strong> $${order.total_amount}</p>
            ${status === 'COMPLETED' ? '<p style="color: green;">✅ Order successfully completed and inventory updated.</p>' : ''}
            ${status === 'CANCELLED' ? '<p style="color: red;">❌ Order cancelled. Consider refund if payment was processed.</p>' : ''}
            <p><small>Note: Set ADMIN_ORDER_NOTIFICATIONS=false in .env to disable these notifications</small></p>
          `;
          
          await emailService.sendEmail(
            process.env.ADMIN_EMAIL,
            `Order ${status}: ${order.order_number}`,
            adminUpdateEmail
          );
          console.log(`📧 Admin notification sent for order ${status.toLowerCase()}`);
        } else {
          console.log(`ℹ️ Admin order notifications disabled or not critical status change`);
        }
        
      } catch (emailError) {
        console.error("❌ Error sending status update notifications:", emailError.message);
        // Don't fail the status update if email fails
      }
    }
  } catch (error) {
    console.error("❌ Error updating sales order:", error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// ====================================
// GET SALES ANALYTICS
// ====================================
const getSalesAnalytics = async (req, res) => {
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
    
    // Analytics for completed orders only
    const completedFilter = { ...dateFilter, status: "COMPLETED" }
    
    // Total orders and revenue
    const totalOrders = await SalesOrder.countDocuments(completedFilter)
    const revenueResult = await SalesOrder.aggregate([
      { $match: completedFilter },
      { $group: { _id: null, total_revenue: { $sum: "$total_amount" } } }
    ])
    
    // Split by order type
    const quickSalesCount = await SalesOrder.countDocuments({ ...completedFilter, is_single_item: true })
    const multiItemCount = await SalesOrder.countDocuments({ ...completedFilter, is_single_item: { $ne: true } })
    
    const totalRevenue = revenueResult[0]?.total_revenue || 0
    
    res.status(200).json({
      success: true,
      data: {
        total_orders: totalOrders,
        quick_sales_count: quickSalesCount,
        multi_item_orders_count: multiItemCount,
        total_revenue: totalRevenue,
        average_order_value: totalOrders > 0 ? totalRevenue / totalOrders : 0
      }
    })
  } catch (error) {
    console.error("❌ Error fetching sales analytics:", error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// ====================================
// GET SALES DASHBOARD ANALYTICS
// ====================================
const getSalesDashboard = async (req, res) => {
  try {
    const today = new Date()
    const last30Days = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000))
    const last7Days = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000))

    // Recent sales total revenue (last 30 days)
    const recentRevenueResult = await SalesOrder.aggregate([
      { 
        $match: { 
          status: "COMPLETED",
          createdAt: { $gte: last30Days }
        }
      },
      { 
        $group: { 
          _id: null, 
          total_revenue: { $sum: "$total_amount" },
          total_orders: { $sum: 1 }
        }
      }
    ])

    // Weekly revenue (last 7 days)
    const weeklyRevenueResult = await SalesOrder.aggregate([
      { 
        $match: { 
          status: "COMPLETED",
          createdAt: { $gte: last7Days }
        }
      },
      { 
        $group: { 
          _id: null, 
          total_revenue: { $sum: "$total_amount" }
        }
      }
    ])

    // Top products by revenue (last 30 days)
    const topProductsByRevenue = await SalesOrder.aggregate([
      { 
        $match: { 
          status: "COMPLETED",
          createdAt: { $gte: last30Days }
        }
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product_id",
          total_revenue: { 
            $sum: { 
              $multiply: ["$items.quantity", "$items.unit_price"] 
            }
          },
          total_quantity_sold: { $sum: "$items.quantity" },
          sales_count: { $sum: 1 }
        }
      },
      { 
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product_info"
        }
      },
      { $unwind: "$product_info" },
      {
        $project: {
          product_name: "$product_info.name",
          product_sku: "$product_info.sku",
          category: "$product_info.category",
          total_revenue: 1,
          total_quantity_sold: 1,
          sales_count: 1
        }
      },
      { $sort: { total_revenue: -1 } },
      { $limit: 5 }
    ])

    // Low stock items (products below reorder point)
    const lowStockItems = await Product.find({
      $expr: {
        $lt: ["$current_stock", "$reorder_point"]
      }
    })
    .select("name sku category current_stock reorder_point")
    .sort({ current_stock: 1 })
    .limit(10)

    const recentRevenue = recentRevenueResult[0] || { total_revenue: 0, total_orders: 0 }
    const weeklyRevenue = weeklyRevenueResult[0] || { total_revenue: 0 }

    res.status(200).json({
      success: true,
      data: {
        recent_sales: {
          total_revenue_30_days: recentRevenue.total_revenue,
          total_orders_30_days: recentRevenue.total_orders,
          weekly_revenue: weeklyRevenue.total_revenue,
          average_order_value: recentRevenue.total_orders > 0 ? 
            recentRevenue.total_revenue / recentRevenue.total_orders : 0
        },
        top_products_by_revenue: topProductsByRevenue,
        low_stock_items: lowStockItems.map(item => ({
          _id: item._id,
          name: item.name,
          sku: item.sku,
          category: item.category,
          current_stock: item.current_stock,
          reorder_point: item.reorder_point,
          stock_shortage: item.reorder_point - item.current_stock
        }))
      }
    })
  } catch (error) {
    console.error("❌ Error fetching sales dashboard:", error)
    res.status(500).json({ success: false, message: error.message })
  }
}

module.exports = {
  getAllSales,
  createQuickSale,
  createSalesOrder,
  updateSalesOrderStatus,
  getSalesAnalytics,
  getSalesDashboard
}