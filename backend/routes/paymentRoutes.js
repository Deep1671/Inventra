const express = require("express")
const router = express.Router()
const mongoose = require("mongoose")

const Payment = require("../models/payment")
const Supplier = require("../models/supplier")
const { InventoryTransaction } = require("../models/inventory")
const authMiddleware = require("../middleware/authmiddleware")
const roleMiddleware = require("../middleware/rolemiddleware")

router.use(authMiddleware)

// ==========================
// GET ALL PAYMENTS
// ==========================
router.get(
  "/",
  roleMiddleware(["admin", "manager"]),
  async (req, res) => {
    try {
      const { supplier_id, payment_method } = req.query

      let query = {}
      if (supplier_id) query.supplier_id = supplier_id
      if (payment_method) query.payment_method = payment_method

      const payments = await Payment.find(query)
        .populate("supplier_id")
        .sort({ payment_date: -1 })

      res.status(200).json(payments)
    } catch (error) {
      res.status(500).json({ message: "Error fetching payments", error })
    }
  }
)

// ==========================
// GET PAYMENT BY ID
// ==========================
router.get(
  "/:id",
  roleMiddleware(["admin", "manager"]),
  async (req, res) => {
    try {
      const payment = await Payment.findById(req.params.id).populate("supplier_id")

      if (!payment) {
        return res.status(404).json({ message: "Payment not found" })
      }
      res.status(200).json(payment)
    } catch (error) {
      res.status(500).json({ message: "Error fetching payment", error })
    }
  }
)

// ==========================
// CREATE PAYMENT
// ==========================
router.post(
  "/",
  roleMiddleware(["admin", "manager"]),
  async (req, res) => {
    try {
      const { supplier_id, amount, payment_method, reference_number, notes } = req.body

      // Validation
      if (!supplier_id || !amount || !payment_method) {
        return res.status(400).json({
          message: "Supplier ID, amount, and payment method are required"
        })
      }

      if (amount <= 0) {
        return res.status(400).json({ message: "Amount must be greater than 0" })
      }

      if (!mongoose.Types.ObjectId.isValid(supplier_id)) {
        return res.status(400).json({ message: "Invalid supplier id" })
      }

      // Verify supplier exists
      const supplier = await Supplier.findById(supplier_id)
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" })
      }

      if (amount > supplier.balance_due) {
        return res.status(400).json({
          message: "Payment amount cannot exceed supplier balance due"
        })
      }

      const payment = new Payment({
        supplier_id,
        amount,
        payment_method,
        reference_number,
        notes,
        recorded_by: req.user?.name || "SYSTEM"
      })

      await payment.save()

      // Create inventory transaction record
      const transaction = new InventoryTransaction({
        product_id: null,
        product_name: `Supplier Payment - ${supplier.name}`,
        transaction_type: "SUPPLIER_PAYMENT",
        quantity_change: 0,
        quantity_before: 0,
        quantity_after: 0,
        reference_id: payment._id,
        reference_type: "Payment",
        created_by: req.user?._id || new mongoose.Types.ObjectId('000000000000000000000000'),
        notes: `Payment of ₹${amount} via ${payment_method}. Reference: ${reference_number || 'N/A'}`
      })

      await transaction.save()

      // Update supplier balance
      supplier.balance_due = Math.max(0, supplier.balance_due - amount)
      supplier.total_paid += amount
      await supplier.save()

      await payment.populate("supplier_id")

      res.status(201).json({
        message: "Payment recorded successfully",
        payment
      })
    } catch (error) {
      res.status(500).json({ message: "Error creating payment", error })
    }
  }
)

// ==========================
// UPDATE PAYMENT
// ==========================
router.put(
  "/:id",
  roleMiddleware(["admin", "manager"]),
  async (req, res) => {
    try {
      const { amount, payment_method, reference_number, notes } = req.body

      const payment = await Payment.findById(req.params.id)
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" })
      }

      const oldAmount = payment.amount

      // Update fields
      if (amount !== undefined && amount > 0) payment.amount = amount
      if (payment_method !== undefined) payment.payment_method = payment_method
      if (reference_number !== undefined) payment.reference_number = reference_number
      if (notes !== undefined) payment.notes = notes

      // If amount changed, update supplier balance
      if (amount !== undefined && amount !== oldAmount) {
        const supplier = await Supplier.findById(payment.supplier_id)
        if (supplier) {
          if (amount > supplier.balance_due + oldAmount) {
            return res.status(400).json({
              message: "Updated amount cannot exceed supplier balance due"
            })
          }

          const difference = amount - oldAmount
          supplier.balance_due = Math.max(0, supplier.balance_due - difference)
          supplier.total_paid = supplier.total_paid - oldAmount + amount
          await supplier.save()
        }
      }

      await payment.save()
      await payment.populate("supplier_id")

      res.status(200).json({
        message: "Payment updated successfully",
        payment
      })
    } catch (error) {
      res.status(500).json({ message: "Error updating payment", error })
    }
  }
)

// ==========================
// DELETE PAYMENT
// ==========================
router.delete(
  "/:id",
  roleMiddleware(["admin"]),
  async (req, res) => {
    try {
      const payment = await Payment.findById(req.params.id)
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" })
      }

      const supplier = await Supplier.findById(payment.supplier_id)
      if (supplier) {
        supplier.balance_due += payment.amount
        supplier.total_paid = Math.max(0, supplier.total_paid - payment.amount)
        await supplier.save()
      }

      // Delete corresponding inventory transaction
      await InventoryTransaction.findOneAndDelete({ reference_id: req.params.id, reference_type: "Payment" })

      await Payment.findByIdAndDelete(req.params.id)
      res.status(200).json({ message: "Payment deleted successfully" })
    } catch (error) {
      res.status(500).json({ message: "Error deleting payment", error })
    }
  }
)

// ==========================
// GET PAYMENTS FOR SUPPLIER
// ==========================
router.get(
  "/supplier/:supplier_id",
  roleMiddleware(["admin", "manager"]),
  async (req, res) => {
    try {
      const payments = await Payment.find({
        supplier_id: req.params.supplier_id
      })
        .populate("supplier_id")
        .sort({ payment_date: -1 })

      res.status(200).json(payments)
    } catch (error) {
      res.status(500).json({ message: "Error fetching supplier payments", error })
    }
  }
)

module.exports = router
