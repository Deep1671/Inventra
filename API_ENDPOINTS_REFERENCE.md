# Smart Inventory Management System - API Endpoints Reference

## **AUTHENTICATION ROUTES** (`/api/auth`)

### Public Endpoints (No Auth Required)
```
POST  /register           - Register new user
POST  /login              - Login with email/password
POST  /google             - Google OAuth authentication
POST  /forgot-password    - Request password reset
POST  /reset-password     - Reset password with token
```

### Protected Endpoints (Auth Required)
```
GET   /                   - Get current user profile
PUT   /                   - Update user profile
```

---

## **PRODUCTS ROUTES** (`/api/products`)

### Product Management (Admin/Manager)
```
GET   /                   - Get all products
GET   /low-stock          - Get low stock products
GET   /:id                - Get product by ID
POST  /                   - Create new product
PUT   /:id                - Update product details
DELETE /:id               - Delete product
```

---

## **INVENTORY ROUTES** (`/api/inventory`)

### Inventory Transactions
```
GET   /transactions                          - Get all inventory transactions
GET   /transactions/product/:productId        - Get product transaction history
POST  /adjustments                           - Create manual stock adjustment
PATCH /transactions/:transactionId/approve   - Approve transaction (Admin)
PATCH /transactions/:transactionId/reject    - Reject transaction (Admin)
```

### Stock Variance
```
POST  /variances                    - Create stock variance report
GET   /variances                    - Get all stock variances
PATCH /variances/:varianceId        - Update variance investigation
```

### Low Stock Alerts
```
GET   /alerts                       - Get all low stock alerts
GET   /low-stock-direct             - Get direct low stock products
POST  /alerts/:alertId/create-po    - Create PO from alert
PATCH /alerts/:alertId/dismiss      - Dismiss alert
```

### Analytics
```
GET   /analytics/summary-by-category - Inventory summary by category
GET   /analytics/movement            - Stock movement analysis
GET   /analytics/aging               - Inventory aging report
```

---

## **SALES ROUTES** (`/api/sales`)

### Sales Data (Analytics/Debug)
```
GET   /debug/product-ages           - Debug endpoint for product ages
GET   /                             - Get all sales
GET   /:id                          - Get sale by ID
POST  /                             - Create new sale
```

---

## **SALES ORDER ROUTES** (`/api/sales-orders`)

### Sales Order Management
```
GET   /                             - Get all sales orders
GET   /:id                          - Get sales order by ID
POST  /                             - Create sales order
PATCH /:id/status                   - Update sales order status
PATCH /:id/cancel                   - Cancel sales order
GET   /analytics/summary            - Get sales order analytics
```

---

## **UNIFIED SALES ROUTES** (`/api/unified-sales`)

### Unified Sales Operations
```
GET   /                             - Get all sales orders
GET   /line-items                   - Get all sales line items
POST  /quick                        - Create quick sale
POST  /orders                       - Create multi-item sales order
PATCH /orders/:id/status            - Update sales order status
GET   /analytics                    - Get sales analytics
GET   /dashboard                    - Get sales dashboard data
```

---

## **PURCHASE ORDERS ROUTES** (`/api/purchase-orders`)

### Purchase Order Operations
```
GET   /                             - Get all purchase orders
GET   /:id                          - Get purchase order by ID
POST  /                             - Create purchase order
PATCH /:id/status                   - Update purchase order status
PATCH /:id/cancel                   - Cancel purchase order
POST  /:id/receive                  - Mark items as received
GET   /supplier/:supplerId          - Get POs by supplier
```

---

## **SUPPLIERS ROUTES** (`/api/suppliers`)

### Supplier Management
```
GET   /                             - Get all suppliers
GET   /category/:categoryName        - Get suppliers by category
GET   /:id                          - Get supplier by ID
POST  /                             - Create new supplier
PUT   /:id                          - Update supplier details
DELETE /:id                         - Delete supplier
GET   /:id/payments                 - Get supplier payment history
```

### PayPal Integration (within supplier routes)
```
POST  /:id/payment/paypal           - Create PayPal payment
GET   /payment/paypal/callback      - PayPal callback handler
```

---

## **PAYMENTS ROUTES** (`/api/payments`)

### Payment Management
```
GET   /                             - Get all payments
GET   /:id                          - Get payment by ID
POST  /                             - Create new payment
PATCH /:id/status                   - Update payment status
GET   /supplier/:supplierId         - Get payments by supplier
```

### Payment Methods
```
POST  /method/cash                  - Record cash payment
POST  /method/check                 - Record check payment
POST  /method/bank-transfer         - Record bank transfer
POST  /method/paypal                - Process PayPal payment
```

---

## **USER ROUTES** (`/api/users`)

### User Management (Admin)
```
GET   /                             - Get all users
POST  /                             - Create new user (Admin)
PUT   /:id                          - Update user (Admin)
DELETE /:id                         - Delete user (Admin)
GET   /:id                          - Get user details
```

### User Preferences
```
GET   /:id/preferences              - Get user settings
PUT   /:id/preferences              - Update user preferences
```

---

## **ANALYTICS ROUTES** (`/api/analytics`)

### General Analytics
```
GET   /overview                     - Get system overview
GET   /sales-summary                - Sales analytics summary
GET   /inventory-summary            - Inventory analytics summary
GET   /products/performance         - Product performance
GET   /category/performance         - Category performance
GET   /supplier/performance         - Supplier performance
```

### Time-based Analytics
```
GET   /by-date?startDate=...&endDate=...     - Analytics by date range
GET   /daily                                 - Daily aggregated data
GET   /weekly                                - Weekly aggregated data
GET   /monthly                               - Monthly aggregated data
```

---

## **CHATBOT ROUTES** (`/api/chatbot`)

### Chatbot Operations
```
POST  /query                        - Process user query
GET   /suggestions                  - Get predefined suggestions
GET   /health                       - Health check
```

---

## **FORECAST ROUTES** (`/api/forecast`)
```
(Currently Empty - Available for future forecasting features)
```

---

## **WEBHOOK ROUTES** (`/api/webhooks`)

### External Service Webhooks
```
POST  /paypal                       - PayPal payment webhook
POST  /email                        - Email service webhook
```

---

## **AUTHENTICATION DETAILS**

### Headers Required (for protected routes)
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### JWT Token Structure
```
{
  id: user._id,
  role: "admin|manager|user",
  expiresIn: "1d"
}
```

### Roles
- **admin** - Full system access
- **manager** - Product, sales, inventory, order management
- **user** - View-only access (basic)

---

## **RESPONSE FORMATS**

### Success Response
```json
{
  "status": 200,
  "data": {},
  "message": "Success message"
}
```

### Error Response
```json
{
  "status": 400/401/403/500,
  "message": "Error message",
  "error": "Error details"
}
```

---

## **QUERY PARAMETERS**

### Pagination
```
?page=1&limit=10
```

### Filtering
```
?status=pending
?supplier_id=123abc
?category=Electronics
?startDate=2024-01-01&endDate=2024-12-31
```

### Sorting
```
?sort=createdAt&order=desc
?sort=amount&order=asc
```

---

## **VALIDATION REQUIREMENTS**

### Password
- Minimum 8 characters
- 1 uppercase letter
- 1 number
- 1 special character (!@#$%^&*(),.?":{}|<>)

### Email
- Valid email format
- Unique in system

### Phone (if required)
- Valid phone number format

---

## **ERROR CODES**

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created |
| 400 | Bad Request - Invalid data |
| 401 | Unauthorized - No/invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 500 | Server Error - Internal error |

---

## **RATE LIMITING**
(Currently not implemented - can be added)

---

## **CORS CONFIGURATION**
- Origin: Based on FRONTEND_URL env variable
- Methods: GET, POST, PUT, PATCH, DELETE
- Credentials: true

---

## **TOTAL API ENDPOINTS: 80+**

### Breakdown by Route
- Auth Routes: 5
- Products Routes: 6
- Inventory Routes: 15+
- Sales Routes: 5+
- Sales Order Routes: 5
- Unified Sales Routes: 7
- Purchase Orders Routes: 7+
- Suppliers Routes: 8+
- Payments Routes: 8+
- Users Routes: 6
- Analytics Routes: 8+
- Chatbot Routes: 3
- Webhooks Routes: 2+

---

**Document Updated:** April 4, 2026
**Version:** 1.0
