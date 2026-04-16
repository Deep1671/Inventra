const mongoose = require("mongoose")

const paymentSchema = new mongoose.Schema({
  supplier_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier"
  },

  amount: Number,

  payment_method: String,

  status: {
    type: String,
    enum: ["PENDING", "SUCCESS", "FAILED"],
    default: "SUCCESS"
  },

  razorpay_payout_id: String,

  reference_number: String,
  notes: String,

  recorded_by: String,

  payment_date: {
    type: Date,
    default: Date.now
  }

}, { timestamps: true })

module.exports = mongoose.model("Payment", paymentSchema)