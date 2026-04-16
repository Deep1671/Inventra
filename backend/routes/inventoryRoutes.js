const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventoryController");
const emailAutomation = require("../services/emailAutomationEnhanced");
const auth = require("../middleware/authmiddleware");
const roleMiddleware = require("../middleware/rolemiddleware");

// ====================================
// INVENTORY TRANSACTIONS
// ====================================

// Get all inventory transactions
router.get("/transactions", auth, inventoryController.getInventoryTransactions);

// Get transaction history for specific product
router.get("/transactions/product/:productId", auth, inventoryController.getProductTransactionHistory);

// Create manual stock adjustment
router.post("/adjustments", auth, inventoryController.createStockAdjustment);

// Approve pending transaction
router.patch("/transactions/:transactionId/approve", auth, roleMiddleware(["admin"]), inventoryController.approveTransaction);

// Reject pending transaction
router.patch("/transactions/:transactionId/reject", auth, roleMiddleware(["admin"]), inventoryController.rejectTransaction);

// ====================================
// STOCK VARIANCE TRACKING
// ====================================

// Create stock variance report (from physical count)
router.post("/variances", auth, inventoryController.createStockVariance);

// Get all stock variances
router.get("/variances", auth, inventoryController.getStockVariances);

// Update variance investigation
router.patch("/variances/:varianceId", auth, roleMiddleware(["admin"]), inventoryController.updateVarianceInvestigation);

// ====================================
// LOW STOCK ALERTS
// ====================================

// Get low stock alerts
router.get("/alerts", auth, inventoryController.getLowStockAlerts);

// Get direct low stock products (with auto-alert creation)
router.get("/low-stock-direct", auth, inventoryController.getDirectLowStockProducts);

// Create purchase order from low stock alert
router.post("/alerts/:alertId/create-po", auth, inventoryController.createPOFromAlert);

// Dismiss low stock alert
router.patch("/alerts/:alertId/dismiss", auth, inventoryController.dismissLowStockAlert);

// ====================================
// ANALYTICS & REPORTS
// ====================================

// Get inventory summary by category
router.get("/summary", auth, inventoryController.getInventorySummary);

// Get inventory turnover metrics
router.get("/turnover", auth, inventoryController.getInventoryTurnover);

// Get stock movement summary
router.get("/movements", auth, inventoryController.getStockMovementSummary);

// ====================================
// DASHBOARD & UTILITY
// ====================================

// Get dashboard summary
router.get("/dashboard/summary", auth, inventoryController.getInventoryDashboard);

// Get pending approvals count
router.get("/dashboard/pending", auth, inventoryController.getPendingApprovalsCount);

// ====================================
// EMAIL AUTOMATION
// ====================================

// Manual trigger for low stock alert emails (Admin only)
router.post("/alerts/send-email", auth, roleMiddleware(["admin"]), emailAutomation.checkAndSendLowStockAlerts);

// Manual trigger for daily supplier emails (Admin only)
router.post("/suppliers/send-daily-emails", auth, roleMiddleware(["admin"]), emailAutomation.triggerDailySupplierEmails);

// Manual trigger for auto PO creation (Admin only) - for testing
router.post("/auto-create-pos", auth, roleMiddleware(["admin"]), async (req, res) => {
  try {
    await emailAutomation.autoCreatePOsForLowStock();
    res.status(200).json({
      success: true,
      message: "Auto PO creation completed"
    });
  } catch (error) {
    console.error("❌ Error in auto PO creation:", error);
    res.status(500).json({
      success: false,
      message: "Error in auto PO creation",
      error: error.message
    });
  }
});

// Manual trigger for delivery reminders (Admin only) - for testing
router.post("/send-delivery-reminders", auth, roleMiddleware(["admin"]), async (req, res) => {
  try {
    await emailAutomation.sendDeliveryReminders();
    res.status(200).json({
      success: true,
      message: "Delivery reminder emails sent successfully"
    });
  } catch (error) {
    console.error("❌ Error in delivery reminders:", error);
    res.status(500).json({
      success: false,
      message: "Error sending delivery reminders",
      error: error.message
    });
  }
});

module.exports = router;
