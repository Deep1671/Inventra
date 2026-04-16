const mongoose = require("mongoose")

const salesOrderSchema = new mongoose.Schema(
  {
    order_number: {
      type: String,
      unique: true,
      required: true
    },
    customer_info: {
      name: {
        type: String,
        required: true
      },
      email: {
        type: String
      },
      phone: {
        type: String
      },
      address: {
        type: String
      }
    },
    items: [
      {
        product_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true
        },
        product_name: {
          type: String,
          required: true
        },
        quantity: {
          type: Number,
          required: true,
          min: 1
        },
        unit_price: {
          type: Number,
          required: true,
          min: 0
        },
        subtotal: {
          type: Number,
          required: true,
          min: 0
        }
      }
    ],
    total_amount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ["DRAFT", "CONFIRMED", "PROCESSING", "COMPLETED", "CANCELLED"],
      default: "DRAFT"
    },
    payment_method: {
      type: String,
      enum: ["CASH", "CARD", "BANK_TRANSFER", "CHEQUE", "CREDIT"],
      default: "CASH"
    },
    payment_status: {
      type: String,
      enum: ["PENDING", "PAID", "PARTIAL", "REFUNDED"],
      default: "PENDING"
    },
    order_date: {
      type: Date,
      default: Date.now
    },
    completed_date: {
      type: Date
    },
    notes: {
      type: String,
      default: ""
    },
    created_by: {
      type: String,
      default: "USER"
    },
    discount_amount: {
      type: Number,
      default: 0,
      min: 0
    },
    tax_amount: {
      type: Number,
      default: 0,
      min: 0
    },
    is_single_item: {
      type: Boolean,
      default: false
    },
    migration_source_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale"
    }
  },
  { timestamps: true }
)

// Auto-generate order number
salesOrderSchema.pre("save", async function () {
  if (!this.order_number) {
    const SalesOrder = this.constructor
    const count = await SalesOrder.countDocuments()
    const date = new Date().getFullYear().toString().slice(-2)
    this.order_number = `SO-${date}-${(count + 1).toString().padStart(5, "0")}`
  }
})

// Calculate totals before saving
salesOrderSchema.pre("save", function () {
  // Calculate item subtotals
  this.items.forEach(item => {
    item.subtotal = item.quantity * item.unit_price
  })
  
  // Calculate total amount
  const itemsTotal = this.items.reduce((sum, item) => sum + item.subtotal, 0)
  this.total_amount = itemsTotal + (this.tax_amount || 0) - (this.discount_amount || 0)
})

module.exports = mongoose.model("SalesOrder", salesOrderSchema)