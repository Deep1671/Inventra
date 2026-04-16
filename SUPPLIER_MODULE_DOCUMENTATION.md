# Inventra Supplier Module - Complete Documentation

## Overview
The Supplier Module is a complete supply chain management system that allows you to:
- Manage supplier information and contacts
- Create and track purchase orders
- Automate order creation based on low stock levels
- Track supplier payments and balances
- Link suppliers to products with reorder settings

---

## 📦 Backend Implementation

### 1. Database Models

#### Supplier Model
**File:** `backend/models/supplier.js`

```javascript
{
  name: String (required),
  phone: String (required),
  email: String (required, unique),
  categories: [String] (required),
  address: String,
  city: String,
  state: String,
  balance_due: Number (default: 0),
  total_paid: Number (default: 0),
  bank_details: {
    account_holder: String,
    account_number: String,
    ifsc_code: String,
    bank_name: String
  },
  upi_id: String,
  notes: String,
  is_active: Boolean (default: true),
  timestamps: true
}
```

#### Purchase Order Model
**File:** `backend/models/purchaseOrder.js`

```javascript
{
  order_number: String (unique, auto-generated),
  supplier_id: ObjectId (ref: Supplier),
  status: String (PENDING, ORDERED, DELIVERED, CANCELLED),
  items: [{
    product_id: ObjectId (ref: Product),
    product_name: String,
    quantity: Number,
    unit_price: Number,
    total: Number
  }],
  total_amount: Number,
  expected_delivery_date: Date,
  received_date: Date,
  notes: String,
  created_by: String,
  is_auto_generated: Boolean,
  timestamps: true
}
```

#### Payment Model
**File:** `backend/models/payment.js`

```javascript
{
  supplier_id: ObjectId (ref: Supplier),
  amount: Number (required, min: 0),
  payment_method: String (CASH, BANK_TRANSFER, UPI, CHEQUE),
  reference_number: String,
  notes: String,
  payment_date: Date,
  recorded_by: String,
  timestamps: true
}
```

#### Product Model Additions
**File:** `backend/models/product.js`

Added fields:
```javascript
{
  preferred_supplier_id: ObjectId (ref: Supplier),
  low_stock_threshold: Number,
  reorder_quantity: Number
}
```

---

## 🔌 API Endpoints

### Supplier Endpoints
**Base URL:** `http://localhost:5000/api/suppliers`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Get all suppliers | ✅ |
| GET | `/:id` | Get supplier by ID | ✅ |
| GET | `/category/:categoryName` | Get suppliers by category | ✅ |
| POST | `/` | Create new supplier | ✅ |
| PUT | `/:id` | Update supplier | ✅ |
| DELETE | `/:id` | Delete supplier (admin only) | ✅ |

**Example Request (Create Supplier):**
```javascript
POST /api/suppliers
{
  "name": "TechSupplies Inc",
  "phone": "9999999999",
  "email": "contact@techsupplies.com",
  "categories": ["Electronics", "Groceries"],
  "address": "123 Industrial Park",
  "city": "Bangalore",
  "state": "Karnataka",
  "bank_details": {
    "account_holder": "TechSupplies Inc",
    "account_number": "123456789",
    "ifsc_code": "ICIC0000001",
    "bank_name": "ICICI Bank"
  },
  "upi_id": "techsupplies@upi",
  "notes": "Preferred supplier for electronics"
}
```

---

### Purchase Order Endpoints
**Base URL:** `http://localhost:5000/api/purchase-orders`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Get all purchase orders | ✅ |
| GET | `/:id` | Get order by ID | ✅ |
| GET | `/supplier/:supplier_id/pending` | Get pending orders for supplier | ✅ |
| POST | `/` | Create new purchase order | ✅ |
| PATCH | `/:id/status` | Update order status | ✅ |
| DELETE | `/:id` | Delete order (PENDING only) | ✅ |
| POST | `/auto/check-low-stock` | Auto-create orders (admin only) | ✅ |

**Example Request (Create Order):**
```javascript
POST /api/purchase-orders
{
  "supplier_id": "650a1b2c3d4e5f6g7h8i9j0k",
  "items": [
    {
      "product_id": "640a1b2c3d4e5f6g7h8i9j0k",
      "quantity": 100,
      "unit_price": 50.00
    }
  ],
  "notes": "Urgent delivery needed",
  "expected_delivery_date": "2024-03-25"
}
```

**Order Status Flow:**
1. **PENDING** → Order created but not sent
2. **ORDERED** → Order has been placed with supplier
3. **DELIVERED** → Stock received, supplier balance updated
4. **CANCELLED** → Order cancelled

---

### Payment Endpoints
**Base URL:** `http://localhost:5000/api/payments`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/` | Get all payments | ✅ |
| GET | `/:id` | Get payment by ID | ✅ |
| GET | `/supplier/:supplier_id` | Get payments for supplier | ✅ |
| POST | `/` | Record new payment | ✅ |
| PUT | `/:id` | Update payment | ✅ |
| DELETE | `/:id` | Delete payment (admin only) | ✅ |

**Example Request (Record Payment):**
```javascript
POST /api/payments
{
  "supplier_id": "650a1b2c3d4e5f6g7h8i9j0k",
  "amount": 5000.00,
  "payment_method": "BANK_TRANSFER",
  "reference_number": "UTR123456789",
  "notes": "Payment for invoice INV-2024-001"
}
```

---

## 🎨 Frontend Implementation

### Created Pages

#### 1. Suppliers Page
**File:** `frontend/src/pages/Suppliers.jsx`
**Styles:** `frontend/src/styles/suppliers.css`

**Features:**
- Add/Edit/Delete suppliers
- Search by name or email
- Filter by category
- View supplier financial summary (balance due, total paid)
- Display contact and payment information

#### 2. Purchase Orders Page
**File:** `frontend/src/pages/PurchaseOrders.jsx`
**Styles:** `frontend/src/styles/purchaseOrders.css`

**Features:**
- Create purchase orders with multiple items
- View order status and timeline
- Change order status (PENDING → ORDERED → DELIVERED)
- Filter by status and supplier
- Auto-calculation of order totals

#### 3. Payments Page
**File:** `frontend/src/pages/Payments.jsx`
**Styles:** `frontend/src/styles/payments.css`

**Features:**
- Record supplier payments
- Track payment history
- Supplier account summary with balance tracking
- Payment methods: CASH, BANK_TRANSFER, UPI, CHEQUE
- Visual payment progress indicators

#### 4. Updated Products Page
**File:** `frontend/src/components/ProductModel.jsx` (Updated)

**New Fields:**
- Preferred Supplier (dropdown)
- Low Stock Threshold
- Reorder Quantity

---

## 🚀 Getting Started

### Backend Setup

1. **Start MongoDB** (if not running)

2. **Start Backend Server:**
```bash
cd backend
npm install
npm start
```

The server should run on `http://localhost:5000`

### Frontend Setup

1. **Install Dependencies:**
```bash
cd frontend
npm install
```

2. **Start Development Server:**
```bash
npm run dev
```

The app should run on `http://localhost:5173` (or your configured port)

---

## 📋 Workflow Example

### Complete Supplier Management Flow

**Step 1: Add a Supplier**
```
Navigate to: Suppliers Menu → Click "+ Add Supplier"
Fill in:
- Name: "Electronics Wholesale"
- Email: "sales@elec.com"
- Phone: "9876543210"
- Categories: Electronics
- Click "Add Supplier"
```

**Step 2: Link Supplier to Product**
```
Navigate to: Products → Edit Product
- Product: "Laptop"
- Preferred Supplier: "Electronics Wholesale"
- Low Stock Threshold: 10
- Reorder Quantity: 25
- Save
```

**Step 3: Create Purchase Order (Manual)**
```
Navigate to: Purchase Orders → "+ Create Order"
- Supplier: "Electronics Wholesale"
- Items: Laptop (Qty: 25)
- Status: Starts as PENDING
```

**Step 4: Update Order Status**
```
When order is placed with supplier:
- Click "Mark as Ordered" (status: ORDERED)

When goods arrive:
- Click "Mark as Delivered" (status: DELIVERED)
- Product stock automatically increases
- Supplier balance_due automatically increases
```

**Step 5: Record Payment**
```
Navigate to: Payments → "+ Record Payment"
- Supplier: "Electronics Wholesale"
- Amount: 50000.00
- Method: BANK_TRANSFER
- Reference: UTR123456
- Click "Record Payment"
- Supplier balance_due automatically decreases
- Total paid automatically increases
```

---

## 🔄 Automatic Order Generation

**Scheduled Check (Weekly):**
```
GET /api/purchase-orders/auto/check-low-stock
```

**Logic:**
1. Finds all products where `current_stock ≤ low_stock_threshold`
2. Checks if product has a `preferred_supplier_id`
3. Verifies no PENDING/ORDERED order exists for the product
4. Auto-creates a new purchase order with:
   - Quantity: `reorder_quantity`
   - Unit Price: Product's `cost_price`
   - Status: PENDING
   - Flag: `is_auto_generated: true`

---

## 💡 Key Features

### 1. **Smart Stock Management**
- Low stock threshold triggers automatic orders
- Reorder quantities pre-configured per product
- Prevents over-ordering

### 2. **Financial Tracking**
- Track balance due per supplier
- Record payments with multiple methods
- Payment history per supplier
- Financial summary dashboard

### 3. **Order Lifecycle**
- PENDING: Order created, not yet sent
- ORDERED: Order placed with supplier
- DELIVERED: Goods received, stock updated
- CANCELLED: Order cancelled

### 4. **Supplier Intelligence**
- Categorize suppliers (Electronics, Groceries, etc.)
- Store payment details (Bank/UPI)
- Track multiple contacts
- Active/Inactive status

### 5. **Reporting**
- Order tracking clarity
- Payment history audit trail
- Supplier account summary
- Stock movement visibility

---

## 📊 Database Relationships

```
Product ——— Supplier
   |
   └─► PurchaseOrder ——— Supplier
           |
           └─► Payment
```

**Relationships:**
- Product → preferred_supplier (Optional)
- PurchaseOrder → supplier_id (Required)
- Payment → supplier_id (Required)

---

## ✅ API Testing with Postman

### Test Supplier Creation
```
POST http://localhost:5000/api/suppliers
Headers: {
  "Authorization": "Bearer YOUR_TOKEN",
  "Content-Type": "application/json"
}

Body:
{
  "name": "Test Supplier",
  "phone": "9999999999",
  "email": "test@supplier.com",
  "categories": ["Electronics"]
}
```

---

## 🔒 Authentication & Authorization

All endpoints require:
- **Authentication:** Valid JWT token in Authorization header
- **Authorization:** Admin/Manager roles for most operations
- **Admin Only:** Delete suppliers, delete payments

---

## 📝 Notes

1. All monetary values use 2 decimal places
2. Order numbers auto-generate in format: `PO-YY-00001`
3. Supplier balance_due updates only on DELIVERED status
4. Payments reduce balance_due automatically
5. Product stock updates automatically upon delivery
6. Timestamps (created_at, updated_at) managed by Mongoose

---

## 🐛 Troubleshooting

### Orders not auto-creating?
- Check product has valid `preferred_supplier_id`
- Check `current_stock < low_stock_threshold`
- Check no PENDING/ORDERED order exists for product
- Ensure low_stock_threshold is set > 0

### Payment not updating supplier balance?
- Verify payment was recorded (check status)
- Check payment amount is correct
- Visit supplier page to refresh balance

### Routes not found?
- Ensure all routes are registered in `server.js`
- Check navigation links match route paths
- Clear browser cache and restart dev server

---

## 📞 Support

For documentation updates or additional features:
1. Check existing payment/order history
2. Review supplier transaction logs
3. Verify product-supplier mappings
4. Check low stock thresholds

---

**Version:** 1.0.0  
**Last Updated:** March 2026  
**Status:** Production Ready ✅
