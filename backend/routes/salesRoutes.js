const express = require("express")
const router = express.Router()
const Sale = require("../models/sale")
const Product = require("../models/product")
const authMiddleware = require("../middleware/authmiddleware")
const roleMiddleware = require("../middleware/rolemiddleware")

router.use(authMiddleware)

// CREATE SALE
router.post("/", roleMiddleware(["admin","manager"]), async (req, res) => {
  try {

    const { product_id, quantity_sold } = req.body

    const product = await Product.findById(product_id)

    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    if (product.current_stock < quantity_sold) {
      return res.status(400).json({ message: "Insufficient stock" })
    }

    const revenue = quantity_sold * product.selling_price

    // 🔥 IMPORTANT CHANGE → add date
    // Create sale record (TIME-SERIES FORMAT)
const sale = await Sale.create({
  date: new Date(),
  metadata: {
    product_id: product_id
  },
  product_id: product_id,
  quantity_sold,
  revenue
})

    // Deduct stock
    product.current_stock -= quantity_sold
    await product.save()

    res.status(201).json({
      message: "Sale recorded successfully",
      sale,
      updated_stock: product.current_stock
    })

  } catch (error) {
    res.status(500).json({
      message: "Error creating sale",
      error
    })
  }
})

module.exports = router