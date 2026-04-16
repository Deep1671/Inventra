const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
require("dotenv").config()

const app = express()

// IMPORT ROUTES
const productRoutes = require("./routes/productRoutes")
const authRoutes = require("./routes/authRoutes")
//const forecastRoutes = require("./routes/forecastRoutes")
const inventoryRoutes = require("./routes/inventoryRoutes")
const analyticsRoutes = require("./routes/analyticsRoutes")
const userRoutes = require("./routes/userRoutes")
const salesRoutes = require("./routes/salesRoutes")
const supplierRoutes = require("./routes/supplierRoutes")
const purchaseOrderRoutes = require("./routes/purchaseOrderRoutes")
const salesOrderRoutes = require("./routes/salesOrderRoutes")
const paymentRoutes = require("./routes/paymentRoutes")
const emailAutomation = require("./services/emailAutomationEnhanced")

// MIDDLEWARE
app.use(cors())

app.use(express.json())

// CONNECT DATABASE
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected")
    // Initialize email automation after database connection
    emailAutomation.initializeEmailAutomation()
  })
  .catch(err => console.log("MongoDB connection error:", err))

// ROUTES
app.use("/api/products", productRoutes)
app.use("/api/auth", authRoutes)
//app.use("/api/forecast", forecastRoutes)
app.use("/api/inventory", inventoryRoutes)
app.use("/api/analytics", analyticsRoutes)
app.use("/api/Users", userRoutes)
app.use("/api/sales", salesRoutes)
app.use("/api/sales-orders", salesOrderRoutes)
app.use("/api/suppliers", supplierRoutes)
app.use("/api/purchase-orders", purchaseOrderRoutes)
app.use("/api/payments", paymentRoutes)
// START SERVER
app.listen(5000, () => {
  console.log("Server running on port 5000")
})