const mongoose = require("mongoose")

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    categories: {
      type: [String],
      default: [],
      required: true
    },
    address: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    balance_due: {
      type: Number,
      default: 0,
      min: 0
    },
    total_paid: {
      type: Number,
      default: 0,
      min: 0
    },
    bank_details: {
      account_holder: String,
      account_number: String,
      ifsc_code: String,
      bank_name: String
    },
    upi_id: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      default: ""
    },
    is_active: {
      type: Boolean,
      default: true
    }
    
  },
  { timestamps: true }
)

// ====================================
// PERFORMANCE INDEXES
// ====================================
supplierSchema.index({ name: 1 });                              // Search by name
supplierSchema.index({ email: 1 });                             // Email lookups
supplierSchema.index({ is_active: 1 });                         // Filter active suppliers
supplierSchema.index({ balance_due: 1 });                       // Payment analysis
supplierSchema.index({ createdAt: -1 });                        // Recent suppliers

module.exports = mongoose.model("Supplier", supplierSchema)

