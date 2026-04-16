const express = require("express")
const router = express.Router()

const salesOrderController = require("../controllers/salesOrderController")
const authMiddleware = require("../middleware/authmiddleware")
const roleMiddleware = require("../middleware/rolemiddleware")

// Apply authentication middleware to all routes
router.use(authMiddleware)

// ====================================
// SALES ORDER CRUD OPERATIONS
// ====================================

// Get all sales orders (with filters and pagination)
router.get("/", salesOrderController.getSalesOrders)

// Get single sales order by ID
router.get("/:id", salesOrderController.getSalesOrderById)

// Create new sales order
router.post("/", salesOrderController.createSalesOrder)

// Update sales order status
router.patch("/:id/status", salesOrderController.updateSalesOrderStatus)

// Cancel sales order
router.patch("/:id/cancel", salesOrderController.cancelSalesOrder)

// ====================================
// ANALYTICS & REPORTING
// ====================================

// Get sales order analytics
router.get("/analytics/summary", salesOrderController.getSalesOrderAnalytics)

module.exports = router