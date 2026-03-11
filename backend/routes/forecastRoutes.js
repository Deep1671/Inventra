const express = require("express")
const router = express.Router()
const Sale = require("../models/sale")
const Product = require("../models/product")
const authMiddleware = require("../middleware/authmiddleware")
const roleMiddleware = require("../middleware/rolemiddleware")

router.use(authMiddleware)

// Forecast demand using 7-day moving average
router.get("/:productId", roleMiddleware(["admin","manager"]), async (req, res) => {
  try {

    const productId = req.params.productId

    const sales = await Sale.find({ "metadata.product_id": productId })
    .sort({ date: -1 })
    .limit(7)

    if (sales.length === 0) {
      return res.status(404).json({ message: "No sales data available" })
    }

    const total = sales.reduce((sum, s) => sum + s.quantity_sold, 0)
    const avgDailyDemand = total / sales.length

    const predictedNextWeek = Math.ceil(avgDailyDemand * 7)

    const product = await Product.findById(productId)

    const reorderSuggestion = Math.max(
      0,
      predictedNextWeek - product.current_stock
    )

    res.json({
      product: product.name,
      avg_daily_demand: avgDailyDemand,
      predicted_next_7_days: predictedNextWeek,
      current_stock: product.current_stock,
      suggested_reorder_quantity: reorderSuggestion
    })

  } catch (error) {
    res.status(500).json({ message: "Forecast error", error })
  }
})

module.exports = router