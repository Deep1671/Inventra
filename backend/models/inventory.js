const mongoose = require("mongoose");

// Warehouse Location Schema - Organize stock by physical location
const warehouseLocationSchema = new mongoose.Schema({
  warehouse_name: {
    type: String,
    required: true,
    trim: true
  },
  zone: {
    type: String,
    enum: ["A", "B", "C", "D"],
    default: "A"
  },
  bin_number: {
    type: String,
    required: true,
    trim: true
  },
  rack: {
    type: String,
    default: ""
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  is_primary: {
    type: Boolean,
    default: false
  }
});

// Inventory Transaction Schema - Track every movement
const inventoryTransactionSchema = new mongoose.Schema(
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
    transaction_type: {
      type: String,
      enum: [
        "PURCHASE_ORDER_RECEIVED",
        "SALE",
        "MANUAL_ADJUSTMENT",
        "STOCK_COUNT",
        "DAMAGE",
        "RETURN",
        "TRANSFER",
        "SUPPLIER_PAYMENT"
      ],
      required: true
    },
    quantity_change: {
      type: Number,
      required: true
    },
    quantity_before: {
      type: Number,
      required: true
    },
    quantity_after: {
      type: Number,
      required: true
    },
    reference_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: function() {
        if (this.transaction_type === "PURCHASE_ORDER_RECEIVED") return "PurchaseOrder";
        if (this.transaction_type === "SALE") return "Sale";
        return null;
      }
    },
    reference_type: {
      type: String,
      enum: ["PurchaseOrder", "Sale", "Manual", null],
      default: null
    },
    warehouse_location: {
      type: warehouseLocationSchema,
      default: null
    },
    reason: {
      type: String,
      default: ""
    },
    notes: {
      type: String,
      default: ""
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "APPROVED"
    },
    approval_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    approval_notes: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

// Stock Variance Schema - Track discrepancies
const stockVarianceSchema = new mongoose.Schema(
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
    system_quantity: {
      type: Number,
      required: true
    },
    physical_count: {
      type: Number,
      required: true
    },
    variance: {
      type: Number,
      required: true
    },
    variance_percentage: {
      type: Number,
      required: true
    },
    variance_type: {
      type: String,
      enum: ["SHORTAGE", "OVERAGE"],
      required: true
    },
    warehouse_location: {
      type: warehouseLocationSchema,
      default: null
    },
    reported_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    investigation_status: {
      type: String,
      enum: ["PENDING", "INVESTIGATING", "RESOLVED", "CLOSED"],
      default: "PENDING"
    },
    investigation_notes: {
      type: String,
      default: ""
    },
    resolved_date: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Low Stock Alert Schema
const lowStockAlertSchema = new mongoose.Schema(
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
    current_stock: {
      type: Number,
      required: true
    },
    reorder_point: {
      type: Number,
      required: true
    },
    reorder_quantity: {
      type: Number,
      required: true
    },
    preferred_supplier_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null
    },
    alert_status: {
      type: String,
      enum: ["ACTIVE", "PO_CREATED", "DISMISSED"],
      default: "ACTIVE"
    },
    purchase_order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      default: null
    }
  },
  {
    timestamps: true
  }
);

// ====================================
// PERFORMANCE INDEXES
// ====================================
// Composite indexes for common query patterns
inventoryTransactionSchema.index({ product_id: 1, createdAt: -1 });    // Product history timeline
inventoryTransactionSchema.index({ created_by: 1, transaction_type: 1 }); // User activity tracking
inventoryTransactionSchema.index({ transaction_type: 1, createdAt: -1 }); // Transaction filtering with sorting
inventoryTransactionSchema.index({ status: 1, createdAt: -1 });         // Pending approvals queries
inventoryTransactionSchema.index({ reference_id: 1 });                  // Find transactions by PO/Sale

stockVarianceSchema.index({ product_id: 1, investigation_status: 1 });   // Variance filtering
stockVarianceSchema.index({ investigation_status: 1, createdAt: -1 });   // Investigation queue
stockVarianceSchema.index({ variance_percentage: 1 });                    // High variance alerts

lowStockAlertSchema.index({ product_id: 1, alert_status: 1 });           // Alert filtering
lowStockAlertSchema.index({ alert_status: 1, createdAt: -1 });           // Active alerts list
lowStockAlertSchema.index({ reorder_point: 1 });                         // Reorder analysis

module.exports = {
  InventoryTransaction: mongoose.model("InventoryTransaction", inventoryTransactionSchema),
  StockVariance: mongoose.model("StockVariance", stockVarianceSchema),
  LowStockAlert: mongoose.model("LowStockAlert", lowStockAlertSchema),
  WarehouseLocation: warehouseLocationSchema
};
