const express = require("express")
const router = express.Router()

const Product = require("../models/product")
const Sale = require("../models/sale")

const authMiddleware = require("../middleware/authmiddleware")
const roleMiddleware = require("../middleware/rolemiddleware")

router.use(authMiddleware)

router.get(
  "/reorder-suggestions",
  roleMiddleware(["admin","manager"]),
  async (req, res) => {
    try {

      const products = await Product.find()

      const suggestions = []

      for (const product of products) {

        const sales = await Sale.find({
          "metadata.product_id": product._id
        })
        .sort({ date: -1 })
        .limit(7)

        if (sales.length === 0) continue

        const totalSales = sales.reduce(
          (sum, sale) => sum + sale.quantity_sold,
          0
        )

        const avgDemand = totalSales / sales.length
        const predicted = Math.ceil(avgDemand * 7)

        const reorderQty =
          predicted > product.current_stock
            ? predicted - product.current_stock
            : 0

        if (reorderQty > 0) {
          suggestions.push({
            product: product.name,
            predicted_demand: predicted,
            current_stock: product.current_stock,
            reorder_quantity: reorderQty
          })
        }
      }

      res.json(suggestions)

    } catch (error) {
      res.status(500).json({
        message: "Error generating reorder suggestions",
        error
      })
    }
  }
)

module.exports = router