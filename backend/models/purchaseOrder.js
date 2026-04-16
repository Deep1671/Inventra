const mongoose = require("mongoose")

const purchaseOrderSchema = new mongoose.Schema(
  {
    order_number: {
      type: String,
      unique: true,
      required: true
    },
    supplier_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true
    },
    status: {
      type: String,
      enum: ["PENDING", "ORDERED", "DELIVERED", "CANCELLED"],
      default: "PENDING"
    },
    items: [
      {
        product_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true
        },
        product_name: String,
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
        total: {
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
    expected_delivery_date: {
      type: Date
    },
    received_date: {
      type: Date
    },
    order_sent_date: {
      type: Date
    },
    notes: {
      type: String,
      default: ""
    },
    created_by: {
      type: String,
      default: "SYSTEM"
    },
    is_auto_generated: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
)

// Auto-generate order number
purchaseOrderSchema.pre("save", async function () {
  if (!this.order_number) {
    // Use direct database query to avoid circular dependency
    const PurchaseOrder = this.constructor;
    const count = await PurchaseOrder.countDocuments();
    const date = new Date().getFullYear().toString().slice(-2);
    this.order_number = `PO-${date}-${(count + 1).toString().padStart(5, "0")}`;
  }
});

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema)
