const express = require("express")
const router = express.Router()
const Product = require("../models/product")
const authMiddleware = require("../middleware/authmiddleware")
const roleMiddleware = require("../middleware/rolemiddleware")

router.use(authMiddleware)
// ==========================
// GET ALL PRODUCTS
// ==========================
router.get("/", async (req, res) => {
  try {
    const products = await Product.find()
    res.status(200).json(products)
  } catch (error) {
    res.status(500).json({ message: "Error fetching products", error })
  }
})

// ==========================
// GET SINGLE PRODUCT
// ==========================
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)

    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    res.status(200).json(product)
  } catch (error) {
    res.status(500).json({ message: "Error fetching product", error })
  }
})

// ==========================
// CREATE PRODUCT
// ==========================
router.post("/", async (req, res) => {
  try {
    const newProduct = new Product(req.body)
    const savedProduct = await newProduct.save()

    res.status(201).json(savedProduct)
  } catch (error) {
    res.status(400).json({ message: "Error creating product", error })
  }
})

// ==========================
// UPDATE PRODUCT
// ==========================
router.put("/:id", async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" })
    }

    res.status(200).json(updatedProduct)
  } catch (error) {
    res.status(400).json({ message: "Error updating product", error })
  }
})

// ==========================
// DELETE PRODUCT
// ==========================
router.delete("/:id", async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id)

    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found" })
    }

    res.status(200).json({ message: "Product deleted successfully" })
  } catch (error) {
    res.status(500).json({ message: "Error deleting product", error })
  }
})

// ==========================
// LOW STOCK PRODUCTS
// ==========================
router.get("/low-stock", async (req, res) => {
  try {
    const lowStockProducts = await Product.find({
      $expr: { $lte: ["$current_stock", "$reorder_point"] }
    })

    res.status(200).json(lowStockProducts)
  } catch (error) {
    res.status(500).json({ message: "Error fetching low stock products", error })
  }
})


module.exports = router