const { InventoryTransaction, StockVariance, LowStockAlert } = require("../models/inventory");
const Product = require("../models/product");
const Sale = require("../models/sale");
const PurchaseOrder = require("../models/purchaseOrder");
const emailService = require("../services/emailService");

// ====================================
// INVENTORY TRANSACTION MANAGEMENT
// ====================================

// Get all inventory transactions with filters
exports.getInventoryTransactions = async (req, res) => {
  try {
    const { product_id, transaction_type, days, status } = req.query;
    const filter = {};

    if (product_id) filter.product_id = product_id;
    if (transaction_type) filter.transaction_type = transaction_type;
    if (status) filter.status = status;

    if (days) {
      const date = new Date();
      date.setDate(date.getDate() - parseInt(days));
      filter.createdAt = { $gte: date };
    }

    const transactions = await InventoryTransaction.find(filter)
      .populate("product_id", "name")
      .populate("created_by", "name email")
      .populate("approval_by", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get transactions for specific product
exports.getProductTransactionHistory = async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 50 } = req.query;

    const transactions = await InventoryTransaction.find({ product_id: productId })
      .populate("created_by", "name email")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const product = await Product.findById(productId);

    res.json({
      success: true,
      product: product,
      transactions: transactions,
      count: transactions.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create manual stock adjustment
exports.createStockAdjustment = async (req, res) => {
  try {
    const { product_id, quantity_change, reason, notes, warehouse_location } = req.body;
    const user_id = req.user._id;

    const product = await Product.findById(product_id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const quantity_before = product.current_stock;
    const quantity_after = quantity_before + quantity_change;

    if (quantity_after < 0) {
      return res.status(400).json({
        success: false,
        message: "Adjustment would result in negative stock"
      });
    }

    // Create transaction
    const transaction = new InventoryTransaction({
      product_id,
      product_name: product.name,
      transaction_type: "MANUAL_ADJUSTMENT",
      quantity_change,
      quantity_before,
      quantity_after,
      warehouse_location,
      reason,
      notes,
      created_by: user_id,
      status: "PENDING" // Manual adjustments need approval
    });

    await transaction.save();

    res.json({
      success: true,
      message: "Stock adjustment created and pending approval",
      data: transaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Approve pending transaction and update product stock
exports.approveTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { approval_notes } = req.body;
    const approver_id = req.user._id;

    const transaction = await InventoryTransaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    if (transaction.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: `Cannot approve transaction with status: ${transaction.status}`
      });
    }

    // Update product stock
    await Product.findByIdAndUpdate(
      transaction.product_id,
      { current_stock: transaction.quantity_after },
      { new: true }
    );

    // Update transaction
    transaction.status = "APPROVED";
    transaction.approval_by = approver_id;
    transaction.approval_notes = approval_notes || "";
    await transaction.save();

    res.json({
      success: true,
      message: "Transaction approved and stock updated",
      data: transaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Reject pending transaction
exports.rejectTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { approval_notes } = req.body;
    const approver_id = req.user._id;

    const transaction = await InventoryTransaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    transaction.status = "REJECTED";
    transaction.approval_by = approver_id;
    transaction.approval_notes = approval_notes || "";
    await transaction.save();

    res.json({
      success: true,
      message: "Transaction rejected",
      data: transaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper function to auto-create transactions (called from Sales/PO controllers)
exports.createAutoTransaction = async (product_id, quantity_change, transaction_type, reference_id, reference_type, user_id) => {
  try {
    const product = await Product.findById(product_id);
    if (!product) throw new Error("Product not found");

    const quantity_before = product.current_stock;
    const quantity_after = quantity_before + quantity_change;

    if (quantity_after < 0) {
      throw new Error("Insufficient stock");
    }

    const transaction = new InventoryTransaction({
      product_id,
      product_name: product.name,
      transaction_type,
      quantity_change,
      quantity_before,
      quantity_after,
      reference_id,
      reference_type,
      created_by: user_id || new require('mongoose').Types.ObjectId(),
      status: "APPROVED"
    });

    await transaction.save();

    // Update product stock
    await Product.findByIdAndUpdate(
      product_id,
      { current_stock: quantity_after },
      { new: true }
    );

    // Check for low stock
    if (quantity_after <= product.reorder_point) {
      await exports.createLowStockAlert(product_id, quantity_after);
    }

    return transaction;
  } catch (error) {
    console.error("Error creating auto transaction:", error);
    throw error;
  }
};

// ====================================
// STOCK VARIANCE TRACKING
// ====================================

// Create stock variance (from physical count)
exports.createStockVariance = async (req, res) => {
  try {
    const { product_id, physical_count } = req.body;
    const reporter_id = req.user._id;

    const product = await Product.findById(product_id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const system_quantity = product.current_stock;
    const variance = physical_count - system_quantity;
    const variance_percentage = system_quantity === 0
      ? (physical_count === 0 ? 0 : 100)
      : Number(((variance / system_quantity) * 100).toFixed(2));
    const variance_type = variance < 0 ? "SHORTAGE" : "OVERAGE";

    const stockVariance = new StockVariance({
      product_id,
      product_name: product.name,
      system_quantity,
      physical_count,
      variance,
      variance_percentage,
      variance_type,
      reported_by: reporter_id,
      investigation_status: "PENDING"
    });

    await stockVariance.save();

    res.json({
      success: true,
      message: "Stock variance reported",
      data: stockVariance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all stock variances
exports.getStockVariances = async (req, res) => {
  try {
    const { status, days } = req.query;
    const filter = {};

    if (status) filter.investigation_status = status;

    if (days) {
      const date = new Date();
      date.setDate(date.getDate() - parseInt(days));
      filter.createdAt = { $gte: date };
    }

    const variances = await StockVariance.find(filter)
      .populate("product_id", "name current_stock")
      .populate("reported_by", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: variances.length,
      data: variances
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update variance investigation
exports.updateVarianceInvestigation = async (req, res) => {
  try {
    const { varianceId } = req.params;
    const { investigation_status, investigation_notes } = req.body;

    const variance = await StockVariance.findById(varianceId);
    if (!variance) {
      return res.status(404).json({
        success: false,
        message: "Variance not found"
      });
    }

    const previousStatus = variance.investigation_status;

    if (investigation_status) {
      variance.investigation_status = investigation_status;
    }
    if (typeof investigation_notes === "string") {
      variance.investigation_notes = investigation_notes;
    }
    variance.resolved_date = variance.investigation_status === "RESOLVED" ? new Date() : null;

    let stockUpdated = false;

    // On first resolution, align product stock with approved physical count.
    if (variance.investigation_status === "RESOLVED" && previousStatus !== "RESOLVED") {
      const product = await Product.findById(variance.product_id);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found for this variance"
        });
      }

      const quantity_before = product.current_stock;
      const quantity_after = variance.physical_count;
      const quantity_change = quantity_after - quantity_before;

      await Product.findByIdAndUpdate(
        variance.product_id,
        { current_stock: quantity_after },
        { new: true }
      );

      if (quantity_change !== 0) {
        await InventoryTransaction.create({
          product_id: variance.product_id,
          product_name: variance.product_name,
          transaction_type: "STOCK_COUNT",
          quantity_change,
          quantity_before,
          quantity_after,
          reference_type: "Manual",
          reason: "Variance approved",
          notes: variance.investigation_notes || "Stock reconciled from approved variance",
          created_by: req.user._id,
          status: "APPROVED"
        });
      }

      stockUpdated = true;
    }

    await variance.save();

    res.json({
      success: true,
      message: "Variance investigation updated",
      stock_updated: stockUpdated,
      data: variance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ====================================
// LOW STOCK ALERTS
// ====================================

// Create low stock alert
exports.createLowStockAlert = async (product_id, current_stock) => {
  try {
    const product = await Product.findById(product_id);
    if (!product) return;

    // Check if alert already exists
    const existingAlert = await LowStockAlert.findOne({
      product_id,
      alert_status: "ACTIVE"
    });

    if (existingAlert) return;

    const alert = new LowStockAlert({
      product_id,
      product_name: product.name,
      current_stock,
      reorder_point: product.reorder_point,
      reorder_quantity: product.reorder_quantity,
      preferred_supplier_id: product.preferred_supplier_id
    });

    await alert.save();
  } catch (error) {
    console.error("Error creating low stock alert:", error);
  }
};

// Get active low stock alerts
exports.getLowStockAlerts = async (req, res) => {
  try {
    const { status } = req.query;

    const alerts = await LowStockAlert.find({
      alert_status: status || "ACTIVE"
    })
      .populate("product_id", "name current_stock reorder_point")
      .populate("preferred_supplier_id", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: alerts.length,
      data: alerts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create PO from low stock alert
exports.createPOFromAlert = async (req, res) => {
  try {
    const { alertId } = req.params;
    const user_id = req.user._id;

    console.log("Creating PO for alert:", alertId);

    const alert = await LowStockAlert.findById(alertId)
      .populate("preferred_supplier_id")
      .populate("product_id", "name cost_price selling_price");
    
    console.log("Found alert:", {
      id: alert?._id,
      product: alert?.product_name,
      supplier_id: alert?.preferred_supplier_id?._id,
      supplier_name: alert?.preferred_supplier_id?.name,
      cost_price: alert?.product_id?.cost_price
    });

    if (!alert) {
      return res.status(404).json({ success: false, message: "Alert not found" });
    }

    if (!alert.preferred_supplier_id) {
      return res.status(400).json({
        success: false,
        message: "No preferred supplier set for this product. Please assign a supplier to the product first."
      });
    }

    // Generate order number
    const count = await PurchaseOrder.countDocuments();
    const date = new Date().getFullYear().toString().slice(-2);
    const orderNumber = `PO-${date}-${(count + 1).toString().padStart(5, "0")}`;

    // Get unit price from product cost price
    const unitPrice = alert.product_id?.cost_price || 0;
    const itemTotal = alert.reorder_quantity * unitPrice;

    console.log("Creating PO with data:", {
      order_number: orderNumber,
      supplier_id: alert.preferred_supplier_id._id,
      supplier_name: alert.preferred_supplier_id.name,
      product_id: alert.product_id._id,
      product_name: alert.product_name,
      quantity: alert.reorder_quantity,
      unit_price: unitPrice,
      total: itemTotal
    });

    // Create PurchaseOrder
    const po = new PurchaseOrder({
      order_number: orderNumber,
      supplier_id: alert.preferred_supplier_id._id,
      supplier_name: alert.preferred_supplier_id.name,
      items: [
        {
          product_id: alert.product_id._id,
          product_name: alert.product_name,
          quantity: alert.reorder_quantity,
          unit_price: unitPrice,
          total: itemTotal
        }
      ],
      total_amount: itemTotal,
      status: "PENDING",
      created_by: user_id
    });

    await po.save();
    console.log("PO saved successfully:", po._id);

    // Update alert
    alert.alert_status = "PO_CREATED";
    alert.purchase_order_id = po._id;
    await alert.save();
    console.log("Alert updated successfully");

    res.json({
      success: true,
      message: "Purchase Order created from low stock alert",
      data: {
        alert: alert,
        purchase_order: po
      }
    });
  } catch (error) {
    console.error("Error creating PO from alert:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      details: error.toString()
    });
  }
};

// ====================================
// INVENTORY ANALYTICS & REPORTS
// ====================================

// Get inventory summary by product
exports.getInventorySummary = async (req, res) => {
  try {
    const summary = await Product.aggregate([
      {
        $group: {
          _id: "$category",
          total_products: { $sum: 1 },
          total_stock: { $sum: "$current_stock" },
          total_value: {
            $sum: { $multiply: ["$current_stock", "$cost_price"] }
          },
          low_stock_items: {
            $sum: {
              $cond: [{ $lte: ["$current_stock", "$reorder_point"] }, 1, 0]
            }
          }
        }
      },
      { $sort: { total_value: -1 } }
    ]);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get inventory turnover metrics
exports.getInventoryTurnover = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const turnover = await Sale.aggregate([
      {
        $match: { createdAt: { $gte: startDate } }
      },
      {
        $group: {
          _id: "$product_id",
          total_sold: { $sum: "$quantity_sold" },
          revenue: { $sum: "$revenue" }
        }
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      {
        $project: {
          product_name: "$product.name",
          total_sold: 1,
          revenue: 1,
          current_stock: "$product.current_stock",
          turnover_ratio: {
            $cond: [
              { $eq: ["$product.current_stock", 0] },
              0,
              { $divide: ["$total_sold", "$product.current_stock"] }
            ]
          }
        }
      },
      { $sort: { turnover_ratio: -1 } }
    ]);

    res.json({
      success: true,
      period_days: parseInt(days),
      count: turnover.length,
      data: turnover
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get stock movement summary
exports.getStockMovementSummary = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const movements = await InventoryTransaction.aggregate([
      {
        $match: { createdAt: { $gte: startDate } }
      },
      {
        $group: {
          _id: "$transaction_type",
          count: { $sum: 1 },
          total_quantity: { $sum: "$quantity_change" }
        }
      }
    ]);

    res.json({
      success: true,
      period_days: parseInt(days),
      data: movements
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ====================================
// UTILITY METHODS
// ====================================

// Dismiss low stock alert
exports.dismissLowStockAlert = async (req, res) => {
  try {
    const { alertId } = req.params;

    const alert = await LowStockAlert.findByIdAndUpdate(
      alertId,
      { alert_status: "DISMISSED" },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ success: false, message: "Alert not found" });
    }

    res.json({
      success: true,
      message: "Low stock alert dismissed",
      data: alert
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get pending approvals count
exports.getPendingApprovalsCount = async (req, res) => {
  try {
    const pendingCount = await InventoryTransaction.countDocuments({
      status: "PENDING"
    });

    const varianceCount = await StockVariance.countDocuments({
      investigation_status: "PENDING"
    });

    const alertCount = await LowStockAlert.countDocuments({
      alert_status: "ACTIVE"
    });

    res.json({
      success: true,
      data: {
        pending_approvals: pendingCount,
        pending_variances: varianceCount,
        active_alerts: alertCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get products with low stock (direct calculation)
exports.getDirectLowStockProducts = async (req, res) => {
  try {
    const lowStockProducts = await Product.find({
      $expr: { $lte: ["$current_stock", "$reorder_point"] }
    }).select('name current_stock reorder_point category preferred_supplier_id reorder_quantity');

    // Auto-create alerts for these products if they don't exist
    for (const product of lowStockProducts) {
      const existingAlert = await LowStockAlert.findOne({
        product_id: product._id,
        alert_status: "ACTIVE"
      });

      if (!existingAlert) {
        const alert = new LowStockAlert({
          product_id: product._id,
          product_name: product.name,
          current_stock: product.current_stock,
          reorder_point: product.reorder_point,
          reorder_quantity: product.reorder_quantity || product.reorder_point * 2,
          preferred_supplier_id: product.preferred_supplier_id
        });
        await alert.save();
        console.log(`Created alert for ${product.name} with supplier: ${product.preferred_supplier_id}`);
      } else {
        // Update existing alert with latest data including supplier
        existingAlert.current_stock = product.current_stock;
        existingAlert.reorder_point = product.reorder_point;
        existingAlert.reorder_quantity = product.reorder_quantity || product.reorder_point * 2;
        existingAlert.preferred_supplier_id = product.preferred_supplier_id;
        await existingAlert.save();
        console.log(`Updated alert for ${product.name} with supplier: ${product.preferred_supplier_id}`);
      }
    }

    res.json({
      success: true,
      count: lowStockProducts.length,
      data: lowStockProducts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get inventory dashboard summary
exports.getInventoryDashboard = async (req, res) => {
  try {
    const pendingCount = await InventoryTransaction.countDocuments({ status: "PENDING" });
    const varianceCount = await StockVariance.countDocuments({ investigation_status: "PENDING" });
    const alertCount = await LowStockAlert.countDocuments({ alert_status: "ACTIVE" });
    
    const totalStock = await Product.aggregate([
      {
        $group: {
          _id: null,
          total_items: { $sum: 1 },
          total_quantity: { $sum: "$current_stock" },
          total_value: { $sum: { $multiply: ["$current_stock", "$cost_price"] } }
        }
      }
    ]);

    const recent = await InventoryTransaction.find()
      .populate("product_id", "name")
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        summary: {
          pending_approvals: pendingCount,
          pending_variances: varianceCount,
          active_alerts: alertCount,
          total_products: totalStock[0]?.total_items || 0,
          total_stock: totalStock[0]?.total_quantity || 0,
          inventory_value: totalStock[0]?.total_value || 0
        },
        recent_transactions: recent
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
