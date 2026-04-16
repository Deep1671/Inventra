const express = require("express")
const router = express.Router()
const mongoose = require("mongoose")
const axios = require("axios")

const Supplier = require("../models/supplier")
const Payment = require("../models/payment")
const authMiddleware = require("../middleware/authmiddleware")
const roleMiddleware = require("../middleware/rolemiddleware")

const getPayPalBaseUrl = () => process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com"

const getPayPalAccessToken = async () => {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials are not configured")
  }

  const tokenResponse = await axios.post(
    `${getPayPalBaseUrl()}/v1/oauth2/token`,
    "grant_type=client_credentials",
    {
      auth: {
        username: clientId,
        password: clientSecret
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    }
  )

  return tokenResponse.data.access_token
}

router.use(authMiddleware)

// ==========================
// GET ALL SUPPLIERS
// ==========================
router.get(
  "/",
  roleMiddleware(["admin", "manager"]),
  async (req, res) => {
    try {
      const suppliers = await Supplier.find().sort({ createdAt: -1 })
      res.status(200).json(suppliers)
    } catch (error) {
      res.status(500).json({ message: "Error fetching suppliers", error })
    }
  }
)

// ==========================
// GET SUPPLIERS BY CATEGORY
// ==========================
router.get(
  "/category/:categoryName",
  roleMiddleware(["admin", "manager"]),
  async (req, res) => {
    try {
      const suppliers = await Supplier.find({
        categories: req.params.categoryName,
        is_active: true
      })
      res.status(200).json(suppliers)
    } catch (error) {
      res.status(500).json({ message: "Error fetching suppliers by category", error })
    }
  }
)

// ==========================
// GET SUPPLIER BY ID
// ==========================
router.get(
  "/:id",
  roleMiddleware(["admin", "manager"]),
  async (req, res) => {
    try {
      const supplier = await Supplier.findById(req.params.id)
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" })
      }
      res.status(200).json(supplier)
    } catch (error) {
      res.status(500).json({ message: "Error fetching supplier", error })
    }
  }
)

// ==========================
// GET SUPPLIER PAYMENT HISTORY
// ==========================
router.get(
  "/:id/payments",
  roleMiddleware(["admin", "manager"]),
  async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid supplier id" })
      }

      const supplier = await Supplier.findById(req.params.id)
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" })
      }

      const payments = await Payment.find({ supplier_id: req.params.id })
        .sort({ payment_date: -1 })

      res.status(200).json({
        supplier,
        payments
      })
    } catch (error) {
      res.status(500).json({ message: "Error fetching supplier payments", error })
    }
  }
)

// ==========================
// RECORD PAYMENT FOR SUPPLIER
// ==========================
router.post(
  "/:id/payments",
  roleMiddleware(["admin", "manager"]),
  async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid supplier id" })
      }

      const { amount, payment_method, reference_number, notes, payment_date } = req.body

      if (!amount || amount <= 0 || !payment_method) {
        return res.status(400).json({
          message: "Amount (greater than 0) and payment method are required"
        })
      }

      const supplier = await Supplier.findById(req.params.id)
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" })
      }

      if (amount > supplier.balance_due) {
        return res.status(400).json({
          message: "Payment amount cannot exceed supplier balance due"
        })
      }

      const payment = new Payment({
        supplier_id: req.params.id,
        amount,
        payment_method,
        reference_number,
        notes,
        payment_date,
        recorded_by: req.user?.name || "SYSTEM"
      })

      await payment.save()

      supplier.balance_due = Math.max(0, supplier.balance_due - amount)
      supplier.total_paid += amount
      await supplier.save()

      res.status(201).json({
        message: "Payment recorded successfully",
        payment,
        supplier
      })
    } catch (error) {
      res.status(500).json({ message: "Error recording supplier payment", error })
    }
  }
)

// ==========================
// CREATE PAYPAL ORDER FOR SUPPLIER PAYMENT
// ==========================
router.post(
  "/:id/payments/paypal/create-order",
  roleMiddleware(["admin", "manager"]),
  async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid supplier id" })
      }

      const { amount, currency_code = "USD" } = req.body
      const numericAmount = Number(amount)

      if (!numericAmount || numericAmount <= 0) {
        return res.status(400).json({ message: "Valid amount is required" })
      }

      const supplier = await Supplier.findById(req.params.id)
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" })
      }

      if (numericAmount > supplier.balance_due) {
        return res.status(400).json({
          message: "Payment amount cannot exceed supplier balance due"
        })
      }

      const accessToken = await getPayPalAccessToken()
      const orderResponse = await axios.post(
        `${getPayPalBaseUrl()}/v2/checkout/orders`,
        {
          intent: "CAPTURE",
          purchase_units: [
            {
              description: `Supplier payment - ${supplier.name}`,
              amount: {
                currency_code: String(currency_code).toUpperCase(),
                value: numericAmount.toFixed(2)
              }
            }
          ]
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
          }
        }
      )

      res.status(200).json({
        orderID: orderResponse.data.id
      })
    } catch (error) {
      const apiMessage = error.response?.data?.message || error.message
      res.status(500).json({ message: `Error creating PayPal order: ${apiMessage}` })
    }
  }
)

// ==========================
// CAPTURE PAYPAL ORDER + RECORD PAYMENT
// ==========================
router.post(
  "/:id/payments/paypal/capture-order",
  roleMiddleware(["admin", "manager"]),
  async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid supplier id" })
      }

      const { orderID, notes } = req.body
      if (!orderID) {
        return res.status(400).json({ message: "orderID is required" })
      }

      const supplier = await Supplier.findById(req.params.id)
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" })
      }

      const accessToken = await getPayPalAccessToken()
      const captureResponse = await axios.post(
        `${getPayPalBaseUrl()}/v2/checkout/orders/${orderID}/capture`,
        {},
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
          }
        }
      )

      const capturePayload = captureResponse.data
      const purchaseUnit = capturePayload.purchase_units?.[0]
      const capture = purchaseUnit?.payments?.captures?.[0]

      if (!capture || capture.status !== "COMPLETED") {
        return res.status(400).json({ message: "PayPal payment capture is not completed" })
      }

      const capturedAmount = Number(capture.amount?.value || 0)
      if (!capturedAmount || capturedAmount <= 0) {
        return res.status(400).json({ message: "Captured amount is invalid" })
      }

      if (capturedAmount > supplier.balance_due) {
        return res.status(400).json({
          message: "Captured amount exceeds supplier balance due"
        })
      }

      const existingPayment = await Payment.findOne({ gateway_capture_id: capture.id })
      if (existingPayment) {
        return res.status(200).json({
          message: "Payment already captured and recorded",
          payment: existingPayment
        })
      }

      const payment = new Payment({
        supplier_id: req.params.id,
        amount: capturedAmount,
        payment_method: "PAYPAL",
        reference_number: capture.id,
        notes,
        recorded_by: req.user?.name || "SYSTEM",
        gateway_order_id: orderID,
        gateway_capture_id: capture.id,
        currency_code: capture.amount?.currency_code || "USD",
        payment_date: capture.create_time ? new Date(capture.create_time) : new Date()
      })

      await payment.save()

      supplier.balance_due = Math.max(0, supplier.balance_due - capturedAmount)
      supplier.total_paid += capturedAmount
      await supplier.save()

      res.status(201).json({
        message: "PayPal payment captured and recorded successfully",
        payment,
        supplier
      })
    } catch (error) {
      const apiMessage = error.response?.data?.message || error.message
      res.status(500).json({ message: `Error capturing PayPal order: ${apiMessage}` })
    }
  }
)

// ==========================
// CREATE NEW SUPPLIER
// ==========================
router.post(
  "/",
  roleMiddleware(["admin", "manager"]),
  async (req, res) => {
    try {
      const { name, phone, email, categories, address, city, state, bank_details, upi_id, notes } = req.body

      // Validation
      if (!name || !phone || !email || !categories || categories.length === 0) {
        return res.status(400).json({
          message: "Name, phone, email, and at least one category are required"
        })
      }

      // Check if supplier with same email already exists
      const existingSupplier = await Supplier.findOne({ email })
      if (existingSupplier) {
        return res.status(409).json({ message: "Supplier with this email already exists" })
      }

      const supplier = new Supplier({
        name,
        phone,
        email,
        categories,
        address,
        city,
        state,
        bank_details,
        upi_id,
        notes
      })

      await supplier.save()
      res.status(201).json({ message: "Supplier created successfully", supplier })
    } catch (error) {
      res.status(500).json({ message: "Error creating supplier", error })
    }
  }
)

// ==========================
// UPDATE SUPPLIER
// ==========================
// ==========================
// UPDATE ORDER STATUS
// ==========================
router.patch("/:id/status", async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const { status } = req.body

    const order = await PurchaseOrder.findById(req.params.id).session(session)

    if (!order) {
      throw new Error("Order not found")
    }

    // 💣 Prevent duplicate delivery
    if (order.status === "DELIVERED") {
      throw new Error("Order already delivered")
    }

    // ✅ ONLY WHEN DELIVERED
    if (status === "DELIVERED") {

      // 🔹 1. Update product stock
      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.product_id,
          {
            $inc: { current_stock: item.quantity }
          },
          { session }
        )
      }

      // 🔹 2. Calculate total amount
      const totalAmount = order.items.reduce(
        (sum, item) => sum + item.quantity * item.unit_price,
        0
      )

      // 🔹 3. Update supplier balance_due
      await Supplier.findByIdAndUpdate(
        order.supplier_id,
        {
          $inc: { balance_due: totalAmount }
        },
        { session }
      )

      // 🔹 4. Set received date
      order.received_date = new Date()
    }

    // 🔹 5. Update status
    order.status = status

    await order.save({ session })

    await session.commitTransaction()
    session.endSession()

    res.json({ message: "Order updated successfully" })

  } catch (err) {
    await session.abortTransaction()
    session.endSession()

    res.status(500).json({ message: err.message })
  }
})

module.exports = router