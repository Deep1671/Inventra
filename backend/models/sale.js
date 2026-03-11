const mongoose = require("mongoose")

const saleSchema = new mongoose.Schema(
  {
    // Time-series fields: ensure `date` and `metadata` exist for inserts
    date: {
      type: Date,
      required: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed
    },
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    quantity_sold: {
      type: Number,
      required: true,
      min: 1
    },
    revenue: {
      type: Number,
      required: true
    }
  },
  {
    timestamps: true
  }
)

module.exports = mongoose.model("Sale", saleSchema)