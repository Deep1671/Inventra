const express = require("express")
const router = express.Router()

const PurchaseOrder = require("../models/purchaseOrder")
const Product = require("../models/product")
const Supplier = require("../models/supplier")
const { LowStockAlert, InventoryTransaction } = require("../models/inventory")
const authMiddleware = require("../middleware/authmiddleware")
const roleMiddleware = require("../middleware/rolemiddleware")
const emailService = require("../services/emailService")
const mongoose = require("mongoose")

router.use(authMiddleware)

// ==========================
// GET ALL PURCHASE ORDERS
// ==========================
router.get(
  "/",
  roleMiddleware(["admin", "manager"]),
  async (req, res) => {
    try {
      const { status, supplier_id } = req.query

      let query = {}
      if (status) query.status = status
      if (supplier_id) query.supplier_id = supplier_id

      const orders = await PurchaseOrder.find(query)
        .populate("supplier_id")
        .populate("items.product_id")
        .sort({ createdAt: -1 })

      res.status(200).json(orders)
    } catch (error) {
      res.status(500).json({ message: "Error fetching purchase orders", error })
    }
  }
)

// ==========================
// GET PURCHASE ORDER BY ID
// ==========================
router.get(
  "/:id",
  roleMiddleware(["admin", "manager"]),
  async (req, res) => {
    try {
      const order = await PurchaseOrder.findById(req.params.id)
        .populate("supplier_id")
        .populate("items.product_id")

      if (!order) {
        return res.status(404).json({ message: "Purchase order not found" })
      }
      res.status(200).json(order)
    } catch (error) {
      res.status(500).json({ message: "Error fetching purchase order", error })
    }
  }
)

// ==========================
// CREATE PURCHASE ORDER
// ==========================
router.post(
  "/",
  roleMiddleware(["admin", "manager"]),
  async (req, res) => {
    try {
      const { supplier_id, items, notes, expected_delivery_date } = req.body

      // Validation
      if (!supplier_id || !items || items.length === 0) {
        return res.status(400).json({
          message: "Supplier ID and at least one item are required"
        })
      }

      // Verify supplier exists
      const supplier = await Supplier.findById(supplier_id)
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" })
      }

      // Calculate total and verify products
      let total_amount = 0
      const processedItems = []

      for (const item of items) {
        const product = await Product.findById(item.product_id)
        if (!product) {
          return res.status(404).json({ message: `Product ${item.product_id} not found` })
        }

        if (!item.quantity || item.quantity <= 0) {
          return res.status(400).json({ message: "Item quantity must be greater than 0" })
        }

        if (!item.unit_price || item.unit_price <= 0) {
          return res.status(400).json({ message: "Item unit price must be greater than 0" })
        }

        const itemTotal = item.quantity * item.unit_price
        total_amount += itemTotal

        processedItems.push({
          product_id: item.product_id,
          product_name: product.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: itemTotal
        })
      }

      // Generate order number if not present
      const count = await PurchaseOrder.countDocuments()
      const date = new Date().getFullYear().toString().slice(-2)
      const order_number = `PO-${date}-${(count + 1).toString().padStart(5, "0")}`

      const order = new PurchaseOrder({
        order_number,
        supplier_id,
        items: processedItems,
        total_amount,
        notes,
        expected_delivery_date,
        created_by: req.user?.name || "SYSTEM"
      })

      await order.save()
      await order.populate("supplier_id")
      await order.populate("items.product_id")

      res.status(201).json({
        message: "Purchase order created successfully",
        order
      })
    } catch (error) {
      console.error("❌ Error creating purchase order:", error)
      res.status(500).json({ 
        message: "Error creating purchase order", 
        error: error.message,
        details: error
      })
    }
  }
)

// ==========================
// UPDATE PURCHASE ORDER STATUS
// ==========================
router.patch(
  "/:id/status",
  roleMiddleware(["admin", "manager"]),
  async (req, res) => {
    try {
      const { status } = req.body

      if (!status || !["PENDING", "ORDERED", "DELIVERED", "CANCELLED"].includes(status)) {
        return res.status(400).json({
          message: "Invalid status. Must be PENDING, ORDERED, DELIVERED, or CANCELLED"
        })
      }

      const order = await PurchaseOrder.findById(req.params.id)
      if (!order) {
        return res.status(404).json({ message: "Purchase order not found" })
      }

      // If marking as DELIVERED, update stock and supplier balance
      if (status === "DELIVERED" && order.status !== "DELIVERED") {
        console.log(`\n🚀 Processing DELIVERED status for PO: ${order.order_number}`);
        console.log(`📦 Items to process:`, order.items.length);
        order.received_date = new Date();

        // Update product stock and check for alert dismissal
        for (const item of order.items) {
          console.log(`\n📋 Processing item:`, {
            product_id: item.product_id,
            quantity: item.quantity
          });
          
          const product = await Product.findById(item.product_id);
          if (product) {
            // Update stock
            const oldStock = product.current_stock;
            product.current_stock += item.quantity;
            await product.save();
            
            console.log(`✅ Updated ${product.name}:`);
            console.log(`   📊 Stock: ${oldStock} + ${item.quantity} = ${product.current_stock}`);
            console.log(`   🎯 Reorder point: ${product.reorder_point}`);
            
            // Create inventory transaction for PO received
            const userId = req.user?._id || new mongoose.Types.ObjectId('000000000000000000000000');
            const transaction = new InventoryTransaction({
              product_id: item.product_id,
              product_name: item.product_name || product.name,
              transaction_type: "PURCHASE_ORDER_RECEIVED",
              quantity_change: item.quantity,
              quantity_before: oldStock,
              quantity_after: product.current_stock,
              reference_id: order._id,
              reference_type: "PurchaseOrder",
              created_by: userId,
              notes: `PO ${order.order_number} received - ${item.quantity} units at ₹${item.unit_price}/unit`
            })
            await transaction.save()
            console.log(`📊 Inventory transaction created for ${product.name}`)
            
            // Check if stock is now above reorder point - dismiss alerts if so
            if (product.current_stock > product.reorder_point) {
              console.log(`   📈 Stock (${product.current_stock}) > Reorder point (${product.reorder_point}) - Dismissing alerts...`);
              
              const dismissedAlerts = await LowStockAlert.updateMany(
                { 
                  product_id: product._id, 
                  alert_status: "ACTIVE" 
                },
                { 
                  alert_status: "RESOLVED",
                  resolved_date: new Date(),
                  resolution_notes: `Stock replenished via PO ${order.order_number}. Current stock: ${product.current_stock}, Reorder point: ${product.reorder_point}`
                }
              );
              
              console.log(`   ✅ Dismissed ${dismissedAlerts.modifiedCount} alerts for ${product.name}`);
            } else {
              console.log(`   ⚠️  Stock still low: ${product.current_stock} <= ${product.reorder_point} - Keeping alerts active`);
            }
          } else {
            console.log(`   ❌ Product not found for ID: ${item.product_id}`);
          }
        }

        // Update supplier balance
        const supplier = await Supplier.findById(order.supplier_id);
        if (supplier) {
          supplier.balance_due += order.total_amount;
          await supplier.save();
          console.log(`✅ Updated supplier balance for ${supplier.name}`);
        }
      }

      const oldStatus = order.status
      order.status = status
      await order.save()
      await order.populate("supplier_id")
      await order.populate("items.product_id")

      // 📧 Send email notification only when status changes to ORDERED
      if (process.env.SEND_EMAILS === 'true' && status === "ORDERED" && oldStatus !== "ORDERED") {
        try {
          const supplier = await Supplier.findById(order.supplier_id._id || order.supplier_id)
          
          // Send email to supplier
          if (supplier && supplier.email) {
            console.log(`📧 Sending PO email to supplier: ${supplier.email}`);
            const emailContent = emailService.generatePurchaseOrderEmail(order, supplier)
            await emailService.sendEmail(
              supplier.email,
              `Purchase Order - ${order.order_number}`,
              emailContent
            )
            console.log(`✅ PO email sent successfully to ${supplier.name}`);
          }
        } catch (emailError) {
          console.error(`❌ Failed to send PO email:`, emailError.message);
          // Don't fail the entire request if email fails
        }
      }

      // 📧 Send notification to admin for other important status changes
      if (process.env.SEND_EMAILS === 'true' && ['DELIVERED', 'CANCELLED'].includes(status) && process.env.ADMIN_EMAIL) {
        try {
          console.log(`📧 Sending status notification to admin: ${process.env.ADMIN_EMAIL}`);
          const supplier = await Supplier.findById(order.supplier_id._id || order.supplier_id)
          const adminEmailContent = emailService.generateStatusUpdateEmail(order, supplier, oldStatus, status)
          await emailService.sendEmail(
            process.env.ADMIN_EMAIL,
            `PO Status Update - ${order.order_number} [${status}]`,
            adminEmailContent
          )
          console.log(`✅ Status notification sent to admin`);
        } catch (emailError) {
          console.error(`❌ Failed to send admin notification:`, emailError.message);
          // Don't fail the entire request if email fails
        }
      }

      res.status(200).json({
        message: "Purchase order status updated successfully",
        order
      })
    } catch (error) {
      console.error("❌ Error updating purchase order status:", error)
      res.status(500).json({ 
        message: "Error updating purchase order", 
        error: error.message,
        details: error
      })
    }
  }
)

// ==========================
// DELETE PURCHASE ORDER
// ==========================
router.delete(
  "/:id",
  roleMiddleware(["admin", "manager"]),
  async (req, res) => {
    try {
      const order = await PurchaseOrder.findById(req.params.id)
      if (!order) {
        return res.status(404).json({ message: "Purchase order not found" })
      }

      // Can only delete PENDING or CANCELLED orders
      if (![" PENDING", "CANCELLED"].includes(order.status)) {
        return res.status(400).json({
          message: "Can only delete PENDING or CANCELLED purchase orders"
        })
      }

      await PurchaseOrder.findByIdAndDelete(req.params.id)
      res.status(200).json({ message: "Purchase order deleted successfully" })
    } catch (error) {
      res.status(500).json({ message: "Error deleting purchase order", error })
    }
  }
)

// ==========================
// GET PENDING ORDERS BY SUPPLIER
// ==========================
router.get(
  "/supplier/:supplier_id/pending",
  roleMiddleware(["admin", "manager"]),
  async (req, res) => {
    try {
      const orders = await PurchaseOrder.find({
        supplier_id: req.params.supplier_id,
        status: { $in: ["PENDING", "ORDERED"] }
      })
        .populate("supplier_id")
        .populate("items.product_id")
        .sort({ created_at: -1 })

      res.status(200).json(orders)
    } catch (error) {
      res.status(500).json({ message: "Error fetching pending orders", error })
    }
  }
)

// ==========================
// AUTO-CREATE ORDERS FOR LOW STOCK
// ==========================
router.post(
  "/auto/check-low-stock",
  roleMiddleware(["admin"]),
  async (req, res) => {
    try {
      const lowStockProducts = await Product.find({
        $expr: {
          $lte: ["$current_stock", { $cond: ["$low_stock_threshold", "$low_stock_threshold", "$reorder_point"] }]
        },
        preferred_supplier_id: { $ne: null }
      })

      const createdOrders = []

      for (const product of lowStockProducts) {
        // Check if there's already a pending order for this product
        const existingOrder = await PurchaseOrder.findOne({
          "items.product_id": product._id,
          status: { $in: ["PENDING", "ORDERED"] }
        })

        if (!existingOrder) {
          // Create new order
          const order = new PurchaseOrder({
            supplier_id: product.preferred_supplier_id,
            items: [
              {
                product_id: product._id,
                product_name: product.name,
                quantity: product.reorder_quantity || 10,
                unit_price: product.cost_price,
                total: (product.reorder_quantity || 10) * product.cost_price
              }
            ],
            total_amount: (product.reorder_quantity || 10) * product.cost_price,
            is_auto_generated: true,
            created_by: "SYSTEM"
          })

          await order.save()
          createdOrders.push(order)
        }
      }

      res.status(200).json({
        message: `Checked ${lowStockProducts.length} products, created ${createdOrders.length} orders`,
        created_orders: createdOrders
      })
    } catch (error) {
      res.status(500).json({ message: "Error checking low stock", error })
    }
  }
)

module.exports = router
