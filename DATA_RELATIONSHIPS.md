# 🔄 DATA RELATIONSHIPS AFTER SEEDING

## 📊 Entity Relationship Map

```
SUPPLIERS (10 entities)
    ├─ TechElectronics Wholesale
    │   └─ ┌──────────────────────────┐
    │      │ PRODUCTS (linked to):    │
    │      │ • Dell Laptop XPS 13     │
    │      │ • Apple MacBook Pro      │
    │      └──────────────────────────┘
    │        └─ PURCHASE ORDERS (possible)
    │            └─ PAYMENTS (optional)
    │
    ├─ Fresh Foods & Groceries
    │   └─ ┌──────────────────────────┐
    │      │ PRODUCTS (linked to):    │
    │      │ • Organic Basmati Rice   │
    │      │ • Fresh Tomatoes         │
    │      └──────────────────────────┘
    │
    ├─ Fashion & Apparel Trading
    │   └─ ┌──────────────────────────┐
    │      │ PRODUCTS (linked to):    │
    │      │ • Cotton T-Shirt Pack    │
    │      │ • Denim Jeans (⚠️ LOW)  │
    │      └──────────────────────────┘
    │
    ├─ Bookeaven Publications
    │   └─ ┌──────────────────────────┐
    │      │ PRODUCTS (linked to):    │
    │      │ • Grammar Book           │
    │      └──────────────────────────┘
    │
    ├─ Premium Furniture Solutions
    │   └─ ┌──────────────────────────┐
    │      │ PRODUCTS (linked to):    │
    │      │ • Office Chair           │
    │      │ • Standing Desk (⚠️ LOW) │
    │      └──────────────────────────┘
    │
    ├─ Organic Wellness Center
    │   └─ ┌──────────────────────────┐
    │      │ PRODUCTS (linked to):    │
    │      │ • Organic Green Tea      │
    │      └──────────────────────────┘
    │
    └─ [Other 4 suppliers with 0 products linked]
        (Global Imports, Swift Logistics, Industrial Hardware, Artisan Crafts)
        ⭐ Can create orders for these too!
```

---

## 💾 DATABASE COLLECTIONS

### Before Seeding:
```
MongoDB Database: inventory_management_db
├── users (existing) ✅
├── products (existing) ✅
├── sales (existing) ✅
├── suppliers (EMPTY)
├── purchaseOrders (EMPTY)
└── payments (EMPTY)
```

### After Seeding:
```
MongoDB Database: inventory_management_db
├── users (existing) ✅
├── products (updated) ✅ - Now 10+ with supplier links
├── sales (existing) ✅
├── suppliers ✅ - 10 new documents
├── purchaseOrders (EMPTY until orders created)
└── payments (EMPTY until payments recorded)
```

---

## 🔗 Data Flow During Operations

### Workflow 1: Creating a Purchase Order

```
USER
  │
  └─→ Select Supplier ID: 507f1f77bcf86cd799439xxx
      └─→ Database looks up Supplier
          └─→ SUPPLIERS collection
              └─→ Returns: TechElectronics Wholesale details
      
      └─→ Select Product ID: 507f1f77bcf86cd799439yyy
      └─→ Database looks up Product
          └─→ PRODUCTS collection
              └─→ Returns: Dell Laptop details
      
      └─→ SYSTEM auto-generates Order Number: PO-25-00001
      
      └─→ Creates new PURCHASE ORDER:
          {
            order_number: "PO-25-00001",          ← Auto-generated
            supplier_id: "507f1f77bcf86cd799439xxx" ← Foreign Key
            items: [{
              product_id: "507f1f77bcf86cd799439yyy" ← Foreign Key
              product_name: "Dell Laptop XPS 13",
              quantity: 5,
              unit_price: 45000
            }],
            total_amount: 225000,
            status: "PENDING"
          }
          └─→ Saved to: PURCHASEORDERS collection ✅
```

### Workflow 2: Updating Order Status → DELIVERED

```
PURCHASE ORDER (status: PENDING)
  │
  └─→ User clicks "Mark as DELIVERED"
      │
      ├─→ Update PURCHASEORDERS collection
      │   └─→ status: "PENDING" → "DELIVERED" ✅
      │
      ├─→ AUTO-TRIGGER: Update PRODUCTS collection
      │   └─→ Find: Dell Laptop (product_id from order)
      │       └─→ Increase stock_level by 5 ✅
      │
      └─→ AUTO-TRIGGER: Update SUPPLIERS collection
          └─→ Find: TechElectronics (supplier_id from order)
              └─→ Increase balance_due by 225000 ✅
                 (Now owes us ₹225,000)
```

### Workflow 3: Recording a Payment

```
PAYMENT FORM
  │
  ├─→ Select Supplier: "TechElectronics Wholesale" (supplier_id)
  ├─→ Amount: 50,000
  ├─→ Method: "BANK_TRANSFER"
  │
  └─→ Creates PAYMENT document:
      {
        supplier_id: "507f1f77bcf86cd799439xxx" ← Foreign Key
        amount: 50000,
        payment_method: "BANK_TRANSFER",
        reference_number: "TRF123456",
        payment_date: "2025-01-15"
      }
      └─→ Saved to: PAYMENTS collection ✅
      
      │
      └─→ AUTO-TRIGGER: Update SUPPLIERS collection
          └─→ Find: TechElectronics (supplier_id)
              └─→ balance_due: 225000 → 175000 (decrease by 50000) ✅
              └─→ total_paid: 0 → 50000 (increase by 50000) ✅
```

### Workflow 4: Auto-Ordering on Low Stock

```
SYSTEM MONITOR (runs on demand or automatic)
  │
  └─→ Check all PRODUCTS for: stock_level < low_stock_threshold
      │
      ├─→ Find: Denim Jeans
      │   └─→ stock: 4, threshold: 3
      │   └─→ 4 > 3, so NO ACTION yet
      │
      ├─→ Find: Standing Desk
      │   └─→ stock: 2, threshold: 2
      │   └─→ 2 = 2, so NO ACTION (not below)
      │
      ├─→ If stock drops below threshold:
      │   └─→ AUTO-CREATE PURCHASE ORDER
      │       ├─→ supplier_id: From product.preferred_supplier_id
      │       ├─→ status: "auto_generated"
      │       ├─→ items: [{product_id, quantity: reorder_quantity}]
      │       └─→ Saved to: PURCHASEORDERS collection ✅
      │
      └─→ ALERT: Notify Manager about new auto-order
```

---

## 🗂️ Collection Structure (After Seeding)

### SUPPLIERS Collection (10 documents)

```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439001"),
  name: "TechElectronics Wholesale",
  email: "sales@techelectronics.com",
  phone: "9876543210",
  categories: ["Electronics", "Computers"],
  address: "Block A, Industrial Park, Unit 102",
  city: "Bangalore",
  state: "Karnataka",
  bank_details: {
    account_holder: "TechElectronics Pvt Ltd",
    account_number: "9876543210123456",
    ifsc_code: "ICIC0000001",
    bank_name: "ICICI Bank"
  },
  upi_id: "techelectronics@upi",
  balance_due: 0,        ← Updated when orders delivered
  total_paid: 0,         ← Updated when payments recorded
  notes: "Established supplier since 2020",
  is_active: true,
  createdAt: "2025-01-15T10:30:00Z",
  updatedAt: "2025-01-15T10:30:00Z"
}
× 10 suppliers total
```

### PRODUCTS Collection (10 documents)

```javascript
// Existing products enhanced with:
{
  _id: ObjectId("507f1f77bcf86cd799439101"),
  name: "Dell Laptop XPS 13",
  category: "Electronics",
  cost_price: 45000,
  selling_price: 55000,
  stock_level: 8,
  reorder_point: 5,
  lead_time_days: 5,
  
  // NEW FIELDS (after seeding):
  preferred_supplier_id: ObjectId("507f1f77bcf86cd799439001"),  ← Links to Supplier
  low_stock_threshold: 5,    ← Triggers alert at < 5
  reorder_quantity: 10,      ← Auto-order this quantity
  
  createdAt: "2025-01-15T10:30:00Z",
  updatedAt: "2025-01-15T10:30:00Z"
}
× 10 products total
```

### PURCHASEORDERS Collection (Empty initially)

```javascript
// Will be created when user creates order:
{
  _id: ObjectId("507f1f77bcf86cd799439201"),
  order_number: "PO-25-00001",       ← Auto-generated format
  supplier_id: ObjectId("507f1f77bcf86cd799439001"),
  status: "PENDING",                 ← Enum: PENDING, ORDERED, DELIVERED, CANCELLED
  items: [
    {
      product_id: ObjectId("507f1f77bcf86cd799439101"),
      product_name: "Dell Laptop XPS 13",
      quantity: 5,
      unit_price: 45000,
      total: 225000
    }
  ],
  total_amount: 225000,
  expected_delivery_date: "2025-01-20",
  received_date: null,               ← Filled when delivered
  created_by: ObjectId("507f1f77bcf86cd799438001"),
  is_auto_generated: false,          ← true if from low-stock trigger
  createdAt: "2025-01-15T10:35:00Z",
  updatedAt: "2025-01-15T10:35:00Z"
}
```

### PAYMENTS Collection (Empty initially)

```javascript
// Will be created when user records payment:
{
  _id: ObjectId("507f1f77bcf86cd799439301"),
  supplier_id: ObjectId("507f1f77bcf86cd799439001"),
  amount: 50000,
  payment_method: "BANK_TRANSFER",   ← Enum: CASH, BANK_TRANSFER, UPI, CHEQUE
  reference_number: "TRF123456",
  notes: "Payment for PO-25-00001",
  payment_date: "2025-01-15",
  recorded_by: ObjectId("507f1f77bcf86cd799438001"),
  createdAt: "2025-01-15T10:40:00Z",
  updatedAt: "2025-01-15T10:40:00Z"
}
```

---

## 🔀 Cross-References (Foreign Keys)

### How Collections Link Together:

```
┌─────────────────┐
│   SUPPLIERS     │
│  (10 documents) │
└────────┬────────┘
         │ _id reference
         │
         ├──→ PURCHASEORDERS.supplier_id
         │
         ├──→ PAYMENTS.supplier_id
         │
         └──→ PRODUCTS.preferred_supplier_id
             │
             ├──→ PURCHASEORDERS.items[].product_id
             │
             └──→ PRODUCTS stock_level (updated when order delivered)


Example Trace:
User records payment of ₹50,000 to supplier_id "ABC123"
  ↓
PAYMENTS collection: Creates {supplier_id: "ABC123", amount: 50000}
  ↓
SUPPLIERS collection: Find {_id: "ABC123"}
  ↓
Update balance_due: 225000 → 175000
Update total_paid: 0 → 50000
```

---

## 📈 Data Lifecycle Example

### Timeline of a Single Order (Denim Jeans Example)

```
Day 1 - 09:00 AM: Initial State
┌─────────────────────────────────────────┐
│ Product: Denim Jeans                    │
│ Stock: 4 units                          │
│ Threshold: 3 units                      │
│ Preferred Supplier: Fashion & Apparel   │
│ Supplier balance_due: ₹0                │
└─────────────────────────────────────────┘

Day 1 - 10:00 AM: User Creates Order
┌─────────────────────────────────────────┐
│ CREATE: Purchase Order                  │
│ Order #: PO-25-00001                    │
│ Supplier: Fashion & Apparel             │
│ Item: Denim Jeans × 15                  │
│ Price: ₹600/unit = ₹9,000 total         │
│ Status: PENDING                         │
└─────────────────────────────────────────┘

Day 3 - 02:00 PM: Order Marked ORDERED
┌─────────────────────────────────────────┐
│ UPDATE: Purchase Order                  │
│ Status: PENDING → ORDERED               │
└─────────────────────────────────────────┘
  (No DB changes yet, waiting for delivery)

Day 5 - 03:00 PM: Order Marked DELIVERED
┌─────────────────────────────────────────┐
│ UPDATE: Purchase Order                  │
│ Status: ORDERED → DELIVERED             │
│                                         │
│ AUTO-TRIGGERS:                          │
│ ✅ PRODUCTS update:                     │
│    Denim Jeans stock: 4 → 19 (+15)      │
│                                         │
│ ✅ SUPPLIERS update:                    │
│    Fashion & Apparel:                   │
│    balance_due: ₹0 → ₹9,000             │
└─────────────────────────────────────────┘

Day 5 - 05:00 PM: Payment Recorded
┌─────────────────────────────────────────┐
│ CREATE: Payment                         │
│ Supplier: Fashion & Apparel             │
│ Amount: ₹5,000                          │
│ Method: Bank Transfer                   │
│                                         │
│ AUTO-TRIGGERS:                          │
│ ✅ SUPPLIERS update:                    │
│    balance_due: ₹9,000 → ₹4,000         │
│    total_paid: ₹0 → ₹5,000              │
└─────────────────────────────────────────┘

Day 6 - 11:00 AM: More Products Sold
┌─────────────────────────────────────────┐
│ PRODUCT INVENTORY UPDATE:               │
│ Denim Jeans sold: 5 units               │
│ Stock: 19 → 14 units                    │
│ (Threshold still 3, no alert)           │
└─────────────────────────────────────────┘
```

---

## 🎯 Key Points to Remember

1. **Suppliers** are independent entities until linked via orders
2. **Products** automatically link to preferred suppliers
3. **Purchase Orders** create the relationship between suppliers and products
4. **Payments** reduce supplier debt
5. **Stock Updates** happen automatically on order delivery
6. **Balance Tracking** is automatic - no manual entry needed
7. **Auto-Ordering** can trigger when stock < threshold

---

## 📝 Summary Tables

### What Gets Created:

| Entity | Count | Status |
|--------|-------|--------|
| Suppliers | 10 | ✅ Ready to seed |
| Products | 10 | ✅ Ready to seed |
| Purchase Orders | 0 | Empty (user creates) |
| Payments | 0 | Empty (user creates) |

### What's Linked:

| Link | Count | Example |
|------|-------|---------|
| Products → Suppliers | 10 | All products have preferred_supplier_id |
| Suppliers → Categories | 20+ | Each supplier has 2-3 categories |
| Products → Stock Levels | 10 | Each has threshold and reorder info |

### What Will Auto-Update:

| Trigger | Updates | Example |
|---------|---------|---------|
| Order Delivered | Product stock + Supplier balance | Stock ↑ | Balance ↑ |
| Payment Recorded | Supplier balance + total_paid | Balance ↓ | Paid ↑ |
| Stock Falls Below Threshold | Auto-creates purchase order | Auto-order queued |

---

**Everything is ready to test end-to-end!** 🚀
