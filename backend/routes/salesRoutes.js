const express = require("express")
const router = express.Router()

const unifiedSalesController = require("../controllers/unifiedSalesController")
const authMiddleware = require("../middleware/authmiddleware")
const roleMiddleware = require("../middleware/rolemiddleware")

router.use(authMiddleware)
router.use(roleMiddleware(["admin","manager"]))

// ====================================
// UNIFIED SALES ENDPOINTS
// Handles both single-item and multi-item sales
// ====================================

// Get all sales (unified view of quick sales + multi-item orders)
router.get("/", unifiedSalesController.getAllSales)

// Create quick sale (single item, immediate completion)
router.post("/quick", unifiedSalesController.createQuickSale)

// Create multi-item sales order
router.post("/orders", unifiedSalesController.createSalesOrder)

// Update sales order status
router.patch("/orders/:id/status", unifiedSalesController.updateSalesOrderStatus)

// Get sales analytics
router.get("/analytics", unifiedSalesController.getSalesAnalytics)

// Get sales dashboard data
router.get("/dashboard", unifiedSalesController.getSalesDashboard)

// ====================================
// BACKWARD COMPATIBILITY 
// Keep old endpoint for existing frontend
// ====================================

// Legacy single sale creation (redirects to quick sale)
router.post("/", unifiedSalesController.createQuickSale)

module.exports = router