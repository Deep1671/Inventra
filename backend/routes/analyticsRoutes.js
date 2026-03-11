const express = require("express")
const router = express.Router()

const Sale = require("../models/sale")
const Product = require("../models/product")

router.get("/dashboard", async (req, res) => {
  try {

    // TOTAL SALES
    const totals = await Sale.aggregate([
      {
        $group: {
          _id: null,
          total_revenue: { $sum: "$revenue" },
          total_quantity_sold: { $sum: "$quantity_sold" }
        }
      }
    ])

    const totalRevenue = totals[0]?.total_revenue || 0
    const totalQuantity = totals[0]?.total_quantity_sold || 0

    // AVERAGE DAILY SALES
    const avgDaily = await Sale.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            day: { $dayOfMonth: "$date" }
          },
          total: { $sum: "$quantity_sold" }
        }
      },
      {
        $group: {
          _id: null,
          avg_daily_sales: { $avg: "$total" }
        }
      }
    ])

    const avgDailySales = avgDaily[0]?.avg_daily_sales || 0

    // TOP PRODUCTS BY QUANTITY
    const topProductsQty = await Sale.aggregate([
  {
    $group: {
      _id: "$metadata.product_id",
      totalQuantity: { $sum: "$quantity_sold" }
    }
  },
  { $sort: { totalQuantity: -1 } },
  { $limit: 5 },
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
      name: "$product.name",
      totalQuantity: 1
    }
  }
])
    // TOP PRODUCTS BY REVENUE
   const topProductsRevenue = await Sale.aggregate([
  {
    $group: {
      _id: "$metadata.product_id",
      totalRevenue: { $sum: "$revenue" }
    }
  },
  { $sort: { totalRevenue: -1 } },
  { $limit: 5 },

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
      name: "$product.name",
      totalRevenue: 1
    }
  }
])
    // LOW STOCK
    const lowStock = await Product.find({
      $expr: { $lte: ["$current_stock", "$reorder_point"] }
    })

    res.json({
      total_revenue: totalRevenue,
      total_quantity_sold: totalQuantity,
      avg_daily_sales: avgDailySales,
      top_products_by_quantity: topProductsQty,
      top_products_by_revenue: topProductsRevenue,
      low_stock_alerts: lowStock
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Dashboard analytics error" })
  }
})

module.exports = router