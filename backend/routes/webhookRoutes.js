const express = require("express")
const router = express.Router()

const Payment = require("../models/payment")
const Supplier = require("../models/supplier")

router.post("/razorpay", async (req, res) => {
  try {
    const event = req.body.event
    const payout = req.body.payload.payout.entity

    const payment = await Payment.findOne({
      razorpay_payout_id: payout.id
    })

    if (!payment) return res.sendStatus(200)

    if (event === "payout.processed") {
      payment.status = "SUCCESS"
      await payment.save()

      const supplier = await Supplier.findById(payment.supplier_id)

      supplier.balance_due -= payment.amount
      supplier.total_paid += payment.amount

      await supplier.save()
    }

    if (event === "payout.failed") {
      payment.status = "FAILED"
      await payment.save()
    }

    res.sendStatus(200)

  } catch (err) {
    console.error(err)
    res.sendStatus(500)
  }
})

module.exports = router