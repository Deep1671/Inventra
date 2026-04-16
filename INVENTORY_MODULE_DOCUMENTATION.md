# 📦 Inventory Tracking Module - Complete Documentation

## Overview
The Inventory Tracking Module is a production-ready system for managing stock movements, warehouse locations, variance tracking, and low stock alerts. It provides complete audit trails and real-time synchronization with Sales and Purchase Orders.

## Module Status
✅ **Production Ready** - Fully Implemented and Tested

---

## Table of Contents
1. [Database Schema](#database-schema)
2. [API Endpoints](#api-endpoints)
3. [Frontend Components](#frontend-components)
4. [Features](#features)
5. [Integration Points](#integration-points)
6. [Usage Guide](#usage-guide)
7. [Testing](#testing)

---

## Database Schema

### 1. InventoryTransaction
Tracks every stock movement with complete audit trail.

```javascript
{
  product_id: ObjectId,              // Reference to Product
  product_name: String,              // Denormalized for queries
  transaction_type: String,          // Enum: PURCHASE_ORDER_RECEIVED, SALE, MANUAL_ADJUSTMENT, STOCK_COUNT, DAMAGE, RETURN, TRANSFER
  quantity_change: Number,           // +/-
  quantity_before: Number,           // State before change
  quantity_after: Number,            // State after change
  reference_id: ObjectId,            // Link to Sale/PurchaseOrder
  reference_type: String,            // Enum: PurchaseOrder, Sale, Manual
  warehouse_location: Object,        // Zone, bin, rack info
  reason: String,                    // "Customer order", "Damaged goods", etc
  notes: String,                     // Additional context
  created_by: ObjectId,              // User who initiated
  status: String,                    // Enum: PENDING, APPROVED, REJECTED
  approval_by: ObjectId,             // Manager who approved
  approval_notes: String,            // Approval comments
  timestamps: true                   // createdAt, updatedAt
}
```

**Indexes:**
- `product_id` + `createdAt` (for transaction history queries)
- `transaction_type` (for filtering)
- `reference_id` (for linking to source)

---

### 2. StockVariance
Tracks discrepancies between system stock and physical counts.

```javascript
{
  product_id: ObjectId,              // Reference to Product
  product_name: String,
  system_quantity: Number,           // System says
  physical_count: Number,            // Physical count shows
  variance: Number,                  // Difference
  variance_percentage: Number,       // (variance / system) * 100
  variance_type: String,             // Enum: SHORTAGE, OVERAGE
  warehouse_location: Object,        // Where variance found
  reported_by: ObjectId,             // User who found it
  investigation_status: String,      // Enum: PENDING, INVESTIGATING, RESOLVED, CLOSED
  investigation_notes: String,       // Root cause analysis
  resolved_date: Date,               // When resolved
  timestamps: true
}
```

---

### 3. LowStockAlert
Automatic alerts when stock drops below reorder point.

```javascript
{
  product_id: ObjectId,              // Reference to Product
  product_name: String,
  current_stock: Number,             // Stock level when alert created
  reorder_point: Number,             // Threshold
  reorder_quantity: Number,          // How much to order
  preferred_supplier_id: ObjectId,   // From Product.preferred_supplier_id
  alert_status: String,              // Enum: ACTIVE, PO_CREATED, DISMISSED
  purchase_order_id: ObjectId,       // Link to auto-created PO
  timestamps: true
}
```

---

## API Endpoints

### Transaction Management

#### GET `/api/inventory/transactions`
Fetch all inventory transactions with filters.

**Query Parameters:**
```
product_id=ObjectId          // Filter by product
transaction_type=string      // PURCHASE_ORDER_RECEIVED, SALE, MANUAL_ADJUSTMENT, etc
days=30                      // Last N days (default: all)
status=string                // PENDING, APPROVED, REJECTED
```

**Response:**
```json
{
  "success": true,
  "count": 25,
  "data": [
    {
      "_id": "...",
      "product_name": "Widget A",
      "transaction_type": "SALE",
      "quantity_change": -5,
      "quantity_before": 100,
      "quantity_after": 95,
      "status": "APPROVED",
      "created_by": { "name": "John" },
      "createdAt": "2024-03-20T10:30:00Z"
    }
  ]
}
```

#### GET `/api/inventory/transactions/product/:productId`
Get transaction history for specific product.

**Response:**
```json
{
  "success": true,
  "product": {
    "name": "Widget A",
    "current_stock": 95,
    "reorder_point": 20
  },
  "transactions": [...],
  "count": 50
}
```

#### POST `/api/inventory/adjustments`
Create manual stock adjustment (requires approval).

**Body:**
```json
{
  "product_id": "ObjectId",
  "quantity_change": 5,           // Can be negative
  "reason": "Physical count correction",
  "notes": "Found extra boxes in storage",
  "warehouse_location": {
    "warehouse_name": "Main",
    "zone": "A",
    "bin_number": "A-01-02",
    "rack": "01"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Stock adjustment created and pending approval",
  "data": {
    "_id": "...",
    "status": "PENDING",
    ...
  }
}
```

#### PATCH `/api/inventory/transactions/:transactionId/approve`
Approve pending adjustment and update product stock.

**Body:**
```json
{
  "approval_notes": "Verified physical count"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transaction approved and stock updated",
  "data": { ... }
}
```

#### PATCH `/api/inventory/transactions/:transactionId/reject`
Reject pending adjustment.

**Body:**
```json
{
  "approval_notes": "Insufficient documentation"
}
```

---

### Stock Variance Tracking

#### POST `/api/inventory/variances`
Report stock variance from physical count.

**Body:**
```json
{
  "product_id": "ObjectId",
  "physical_count": 95        // What we counted
}
```

**Response:**
```json
{
  "success": true,
  "message": "Stock variance reported",
  "data": {
    "_id": "...",
    "system_quantity": 100,
    "physical_count": 95,
    "variance": -5,
    "variance_percentage": -5,
    "variance_type": "SHORTAGE",
    "investigation_status": "PENDING"
  }
}
```

#### GET `/api/inventory/variances`
Get all stock variances with filters.

**Query Parameters:**
```
status=string   // PENDING, INVESTIGATING, RESOLVED, CLOSED
days=30         // Last N days
```

#### PATCH `/api/inventory/variances/:varianceId`
Update variance investigation.

**Body:**
```json
{
  "investigation_status": "RESOLVED",
  "investigation_notes": "Found items in wrong bin, corrected location"
}
```

---

### Low Stock Alerts

#### GET `/api/inventory/alerts`
Get active low stock alerts.

**Query Parameters:**
```
status=string   // ACTIVE, PO_CREATED, DISMISSED
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "...",
      "product_name": "Widget B",
      "current_stock": 15,
      "reorder_point": 20,
      "reorder_quantity": 100,
      "preferred_supplier": { "name": "Supplier X" },
      "alert_status": "ACTIVE"
    }
  ]
}
```

#### POST `/api/inventory/alerts/:alertId/create-po`
Auto-create Purchase Order from low stock alert.

**Response:**
```json
{
  "success": true,
  "message": "Purchase Order created from low stock alert",
  "data": {
    "alert": { ... },
    "purchase_order": {
      "_id": "...",
      "supplier_id": "...",
      "status": "PENDING",
      "products": [
        {
          "product_id": "...",
          "product_name": "Widget B",
          "quantity": 100
        }
      ]
    }
  }
}
```

---

### Analytics & Reports

#### GET `/api/inventory/summary`
Inventory summary grouped by category.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "Electronics",
      "total_products": 5,
      "total_stock": 250,
      "total_value": 12500,
      "low_stock_items": 2
    }
  ]
}
```

#### GET `/api/inventory/turnover`
Inventory turnover metrics.

**Query Parameters:**
```
days=30  // Period to analyze
```

**Response:**
```json
{
  "success": true,
  "period_days": 30,
  "count": 10,
  "data": [
    {
      "product_name": "Widget A",
      "total_sold": 45,
      "revenue": 4500,
      "current_stock": 95,
      "turnover_ratio": 0.47
    }
  ]
}
```

#### GET `/api/inventory/movements`
Stock movement summary by transaction type.

**Response:**
```json
{
  "success": true,
  "period_days": 30,
  "data": [
    {
      "_id": "SALE",
      "count": 120,
      "total_quantity": -450
    },
    {
      "_id": "PURCHASE_ORDER_RECEIVED",
      "count": 8,
      "total_quantity": 500
    }
  ]
}
```

---

## Frontend Components

### Inventory Page (`/inventory`)

**Main Tabs:**

1. **Transactions Tab**
   - Display: Table of all transactions
   - Filters: Product, Type, Days, Status
   - Features: Real-time updates, approval workflow
   - Shows: Product, Type, Quantity Change, Before→After, Status, Date, Created By

2. **Variances Tab**
   - Display: Grid of variance cards
   - Each card shows: System vs Physical count, Type (Shortage/Overage), Investigation status
   - Features: Click to investigate, update notes
   - Color coded by severity

3. **Low Stock Alerts Tab**
   - Display: Grid of alert cards
   - Each card shows: Current stock, Reorder point, Reorder qty, Preferred supplier
   - Features: One-click PO creation, dismiss alert
   - Auto-removed when PO created

4. **Analytics Tab**
   - Sub-section 1: Inventory Summary by Category
     - Shows: Total stock, Total value, Low stock items per category
   - Sub-section 2: Turnover Metrics (Last 30 Days)
     - Shows: Units sold, Current stock, Turnover ratio, Revenue

**Action Buttons:**
- "+ Stock Adjustment" - Opens modal for manual adjustment
- "+ Physical Count" - Opens modal to report variance
- "Create PO" - Auto-creates purchase order from alert
- "Dismiss" - Dismiss low stock alert

---

## Features

### ✅ Transaction Management
- **Complete audit trail** - Every stock movement tracked
- **Transaction types** - 7 types covering all scenarios
- **Approval workflow** - Manual adjustments require manager approval
- **Auto-transactions** - Sales/PO automatically create transactions
- **References** - Link back to source Sale/PurchaseOrder

### ✅ Warehouse Management
- **Location tracking** - Zone, bin, rack organization
- **Warehouse names** - Multiple warehouses supported
- **Location in transactions** - See exactly where item moved from/to

### ✅ Variance Tracking
- **Physical count integration** - Report discrepancies
- **Root cause analysis** - Investigation status + notes
- **Shortage/Overage tracking** - Know direction of variance
- **Variance percentage** - Calculate severity
- **Investigation lifecycle** - PENDING → INVESTIGATING → RESOLVED → CLOSED

### ✅ Low Stock Alerts
- **Automatic creation** - When stock ≤ reorder point
- **Smart deduplication** - Only one alert per product status
- **One-click PO creation** - Auto-generate purchase orders
- **Supplier linking** - Uses preferred supplier from product
- **Status tracking** - ACTIVE → PO_CREATED → DISMISSED

### ✅ Real-time Sync
- **Sales integration** - Deduct stock immediately
- **PO integration** - Add stock on delivery
- **Alert triggering** - Auto-check for low stock after transactions
- **No manual updates** - All happens automatically

### ✅ Analytics & Reporting
- **Category summary** - Stock value by category
- **Turnover analysis** - Which items move fastest
- **Movement trends** - In/out balance
- **Exportable data** - All data available for export

---

## Integration Points

### 1. Sales Module
When a sale is created:
```
Sale Created
  ↓
Auto-create InventoryTransaction
  ↓
Update Product.current_stock
  ↓
Check if stock ≤ reorder_point
  ↓
Create LowStockAlert (if needed)
```

### 2. Purchase Order Module
When PO status changes to DELIVERED:
```
PO Marked as DELIVERED
  ↓
For each product in PO:
  - Auto-create InventoryTransaction (PURCHASE_ORDER_RECEIVED)
  - Update Product.current_stock
  ↓
Update LowStockAlert (if applicable)
```

### 3. Product Module
When product is updated:
- If `reorder_point` changes, check current alerts
- If `preferred_supplier_id` changes, update existing alerts
- Validate `current_stock` is consistent with transactions

---

## Usage Guide

### Scenario 1: Normal Sales Flow
1. Sale created for 5 units of Widget A
2. System automatically:
   - Creates SALE transaction
   - Deducts 5 from current_stock
   - Saves quantity_before=100, quantity_after=95
   - Records sold user
3. If stock now ≤ reorder_point (20):
   - Creates low stock alert
   - Notifies manager

### Scenario 2: Physical Count Discrepancy
1. User does physical count, finds 95 units (system shows 100)
2. Goes to "Physical Count" modal, enters 95
3. System creates variance report:
   - SHORTAGE of -5 units
   - Status: PENDING investigation
4. Manager investigates:
   - Reviews transaction history for that product
   - Updates investigation status
   - Notes root cause ("Items in wrong bin", "Damaged goods", etc)
5. If legit shortage:
   - Creates manual adjustment to sync
   - Approval required

### Scenario 3: Stock Adjustment
1. Manager finds extra boxes in storage
2. Creates stock adjustment:
   - Product: Widget A
   - Quantity: +10
   - Reason: "Physical count correction"
   - Warehouse location: Main, Zone A, Bin A-01-02
3. System creates PENDING transaction
4. Another manager reviews and approves
5. Stock updated: 95 → 105

### Scenario 4: Auto-PO from Low Stock
1. Widget B stock drops to 15 (reorder point = 20)
2. Low stock alert created automatically
3. Manager clicks "Create PO"
4. Purchase Order auto-created:
   - Supplier: From product.preferred_supplier_id
   - Quantity: product.reorder_quantity (e.g., 100)
   - Status: PENDING
5. Alert status changes: ACTIVE → PO_CREATED

### Scenario 5: Analyzing Inventory Health
1. Go to Analytics tab
2. View Summary by Category:
   - See which categories have most stock value
   - See which have low stock items
3. View Turnover Metrics:
   - See which products move fastest
   - Identify slow-moving items
   - Calculate inventory efficiency

---

## Testing

### API Testing (with cURL or Postman)

```bash
# Get all transactions
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/inventory/transactions

# Create adjustment
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "ObjectId",
    "quantity_change": 5,
    "reason": "Found extra boxes"
  }' \
  http://localhost:5000/api/inventory/adjustments

# Get low stock alerts
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/inventory/alerts

# Create PO from alert
curl -X POST -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/inventory/alerts/AlertId/create-po

# Get inventory summary
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/inventory/summary

# Get turnover metrics
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/inventory/turnover?days=30
```

### Frontend Testing
1. Login to system
2. Navigate to Inventory from sidebar
3. Test each tab:
   - **Transactions**: Filter, view details
   - **Variances**: Create physical count, investigate
   - **Alerts**: Create PO, dismiss
   - **Analytics**: View summaries, trends
4. Make a sale:
   - Check transaction created automatically
   - Verify stock updated
5. Create manual adjustment:
   - Try to approve/reject
   - Verify stock change applied
6. Check low stock:
   - Create adjustment to drop stock below reorder point
   - Verify alert created automatically

---

## Security Considerations

✅ **Authentication** - All endpoints require Bearer token  
✅ **Authorization** - Restricted to admin/manager roles  
✅ **Approval Workflow** - Manual adjustments require second approval  
✅ **Audit Trail** - All changes tracked with user ID  
✅ **Soft Deletes** - Transactions never deleted (archive if needed)  
✅ **Immutable Records** - Transaction data cannot be modified, only rejected

---

## Performance Optimizations

✅ **Indexes** - Created on `product_id`, `transaction_type`, `reference_id`  
✅ **Pagination Ready** - `.limit()` implemented for large queries  
✅ **Denormalization** - Product name stored to avoid lookup  
✅ **Aggregation** - Analytics use MongoDB aggregation pipeline  
✅ **Status Checks** - Low stock checks only on relevant transitions

---

## Future Enhancements

1. **Batch Import** - CSV upload for physical counts
2. **Barcode Scanning** - Mobile app for warehouse operations
3. **Predictive Analysis** - ML-based demand forecasting
4. **Multi-warehouse** - Advanced location tracking
5. **Notifications** - Email/SMS alerts for low stock
6. **Cycle Counting** - Scheduled physical counts
7. **Lot Tracking** - Expiry dates, batch numbers
8. **Returns Management** - Reverse logistics
9. **Integration** - ERP system connectors

---

## Support & Troubleshooting

**Q: How do I know if inventory is in sync?**  
A: Run physical counts regularly, check Variances tab. Any discrepancy shows immediately.

**Q: Can I undo a transaction?**  
A: No, but you can create an opposite adjustment. This maintains audit trail.

**Q: What if low stock alert doesn't trigger?**  
A: Check if product has `reorder_point` set. Alert only triggers if stock ≤ reorder_point.

**Q: Can multiple managers approve same adjustment?**  
A: No, first approval updates stock. Others see it as APPROVED.

---

## Version History

**v1.0.0 - Initial Release**
- Transaction tracking (7 types)
- Variance detection
- Low stock alerts
- Auto-PO creation
- Analytics & reporting
- Approval workflow
