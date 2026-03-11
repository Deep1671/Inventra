const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
require("dotenv").config()

const app = express()

// IMPORT ROUTES
const productRoutes = require("./routes/productRoutes")
const salesRoutes = require("./routes/salesRoutes")
const authRoutes = require("./routes/authRoutes")
const forecastRoutes = require("./routes/forecastRoutes")
const inventoryRoutes = require("./routes/inventoryRoutes")
const analyticsRoutes = require("./routes/analyticsRoutes")

// MIDDLEWARE
app.use(cors())

app.use(express.json())

// CONNECT DATABASE
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log("MongoDB connection error:", err))

// ROUTES
app.use("/api/products", productRoutes)
app.use("/api/sales", salesRoutes)
app.use("/api/auth", authRoutes)
app.use("/api/forecast", forecastRoutes)
app.use("/api/inventory", inventoryRoutes)
app.use("/api/analytics", analyticsRoutes)

// START SERVER
app.listen(5000, () => {
  console.log("Server running on port 5000")
})