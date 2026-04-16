const mongoose = require("mongoose")

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    category: {
      type: String,
      required: true
    },

    cost_price: {
      type: Number,
      required: true,
      min: 0
    },

    selling_price: {
      type: Number,
      required: true,
      min: 0
    },

    current_stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },

    safety_stock: {
      type: Number,
      default: 0
    },

    reorder_point: {
      type: Number,
      required: true
    },

    lead_time_days: {
      type: Number,
      required: true
    },
    preferred_supplier_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null
    },
    low_stock_threshold: {
      type: Number,
      default: 0,
      min: 0
    },
    reorder_quantity: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
)

// Virtual field for profit per unit
productSchema.virtual("profit_per_unit").get(function () {
  return this.selling_price - this.cost_price
})

// ====================================
// PERFORMANCE INDEXES
// ====================================
// Single field indexes for frequent queries
productSchema.index({ category: 1 });                           // Category filtering
productSchema.index({ current_stock: 1 });                      // Stock level queries
productSchema.index({ reorder_point: 1 });                      // Reorder alerts
productSchema.index({ preferred_supplier_id: 1 });              // Supplier lookups

// Compound index for "low stock products" query
// Prevents double scan when filtering (stock <= reorder_point)
productSchema.index({ current_stock: 1, reorder_point: 1 });

// Indexes for sorting operations
productSchema.index({ selling_price: -1 });                     // High-value products
productSchema.index({ createdAt: -1 });                         // Recent products

// Ensure virtual fields are included in JSON response
productSchema.set("toJSON", { virtuals: true })
productSchema.set("toObject", { virtuals: true })

module.exports = mongoose.model("Product", productSchema)