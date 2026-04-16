const razorpay = require("../config/razorpay")
const Supplier = require("../models/supplier")
const Payment = require("../models/payment")

// ==========================
// SETUP SUPPLIER
// ==========================
exports.setupPayout = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id)

    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" })
    }

    const contact = await razorpay.contacts.create({
      name: supplier.name,
      email: supplier.email,
      contact: supplier.phone,
      type: "vendor"
    })

    const fundAccount = await razorpay.fundAccounts.create({
      contact_id: contact.id,
      account_type: "vpa",
      vpa: {
        address: supplier.upi_id
      }
    })

    supplier.razorpay_contact_id = contact.id
    supplier.razorpay_fund_account_id = fundAccount.id
    supplier.payout_enabled = true

    await supplier.save()

    res.json({ message: "Payout setup complete" })

  } catch (err) {
    res.status(500).json({ message: "Setup failed" })
  }
}

// ==========================
// CREATE PAYOUT
// ==========================
exports.createPayout = async (req, res) => {
  try {
    const { amount } = req.body

    const supplier = await Supplier.findById(req.params.id)

    if (!supplier || !supplier.payout_enabled) {
      return res.status(400).json({ message: "Supplier not ready" })
    }

    if (amount > supplier.balance_due) {
      return res.status(400).json({ message: "Exceeds due" })
    }

    const payout = await razorpay.payouts.create({
      account_number: process.env.RAZORPAY_ACCOUNT_NUMBER,
      fund_account_id: supplier.razorpay_fund_account_id,
      amount: amount * 100,
      currency: "INR",
      mode: "UPI",
      purpose: "vendor_payment"
    })

    await Payment.create({
      supplier_id: supplier._id,
      amount,
      payment_method: "UPI",
      status: "PENDING",
      razorpay_payout_id: payout.id
    })

    res.json({ message: "Payout started" })

  } catch (err) {
    res.status(500).json({ message: "Payout failed" })
  }
}