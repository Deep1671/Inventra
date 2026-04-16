# Inventra Supplier Module - Quick Start Guide 🚀

## First Time Setup

### 1. Start the Backend
```bash
cd backend
npm install  # First time only
npm start
```
✅ Server runs on `http://localhost:5000`

### 2. Start the Frontend
```bash
cd frontend
npm install  # First time only
npm run dev
```
✅ App runs on `http://localhost:5173`

### 3. Login
- Use your existing admin/manager credentials
- You'll see the updated sidebar with new menu items

---

## Your First Supplier Module Setup (5 mins)

### Step 1️⃣: Add Your First Supplier (2 mins)

Click **🤝 Suppliers** in the sidebar

Click **+ Add Supplier** button

Fill in the form:
```
Name: Fresh Foods Co.
Phone: 9876543210
Email: sales@freshfoods.com
Categories: ✓ Groceries  ✓ Vegetables
City: Delhi
State: Delhi
UPI ID: freshfoods@upi
```

Click **Add Supplier** ✅

**Result:** You now have your first supplier in the system!

---

### Step 2️⃣: Link Supplier to a Product (1 min)

Click **📦 Products** in the sidebar

Click **Edit** on any product

Scroll to "Supplier & Inventory Settings"

Select:
```
Preferred Supplier: Fresh Foods Co.
Low Stock Threshold: 10
Reorder Quantity: 50
```

Click **Save** ✅

**Result:** This product will now auto-order when stock drops below 10!

---

### Step 3️⃣: Create Your First Purchase Order (1 min)

Click **📋 Purchase Orders** in the sidebar

Click **+ Create Order** button

Fill in:
```
Supplier: Fresh Foods Co.
Item: [Your Product Name]
Quantity: 50
Unit Price: [auto-filled from product]
Expected Delivery Date: [Pick a date 5 days from now]
```

Click **Create Order** ✅

**Result:** Order created with status = **PENDING**

---

### Step 4️⃣: Track Order Status (1 min)

On the Purchase Orders page, find your order

**Status Flow:**
```
PENDING (Created)
   ↓
Click "Mark as Ordered" 
   ↓
ORDERED (Placed with supplier)
   ↓
Click "Mark as Delivered"
   ↓
DELIVERED (Stock received, balance updated) ✅
```

**What happens on DELIVERED:**
- ✅ Product stock increases by order quantity
- ✅ Supplier balance_due increases by order amount
- ✅ Order shows received date

---

### Step 5️⃣: Record Payment (1 min)

Click **💳 Payments** in the sidebar

Click **+ Record Payment** button

Fill in:
```
Supplier: Fresh Foods Co.
Amount: 2500.00
Payment Method: BANK_TRANSFER
Reference Number: UTR123456789
Notes: Payment for invoice INV-2024-001
```

Click **Record Payment** ✅

**Result:**
- ✅ Supplier balance reduces automatically
- ✅ Total paid increases automatically
- ✅ Payment recorded in history

---

## Key Workflows

### 📖 Workflow 1: Complete Order Cycle

```
1. Products page → Set preferred supplier & thresholds
2. Stock decreases below threshold
3. System auto-creates purchase order (or you create manually)
4. Mark order as ORDERED when placed
5. Receive goods, mark as DELIVERED
6. Stock & balance update automatically
7. Record payment
8. Mark as PAID
```

### 📖 Workflow 2: Quick Reorder

```
1. Go to Purchase Orders
2. Click + Create Order
3. Select supplier and products
4. Confirm order
5. Wait for delivery
6. Mark as Delivered
```

### 📖 Workflow 3: Manage Supplier Payments

```
1. Go to Suppliers page (see balance due)
2. Go to Payments page
3. Record payment
4. See balance updated in real-time
5. View payment history anytime
```

---

## Understanding Status Badges

### Purchase Order Status
```
🟡 PENDING  = Order created, not sent yet
🔵 ORDERED  = Order placed with supplier
🟢 DELIVERED= Stock received
🔴 CANCELLED= Order cancelled
```

### Payment Method Colors
```
🟡 CASH           = Direct cash payment
🔵 BANK_TRANSFER  = Bank wire/transfer
🟢 UPI            = Digital payment
🟣 CHEQUE         = Check payment
```

---

## Common Tasks

### ❓ How do I create an auto-reorder?
1. Go to Products → Edit product
2. Set **Preferred Supplier**, **Low Stock Threshold**, **Reorder Quantity**
3. Save
4. When stock drops below threshold → System auto-creates order ✅

### ❓ How do I see all pending orders from a supplier?
1. Go to Purchase Orders
2. Filter by Status: **PENDING**
3. Filter by Supplier: **[Your supplier name]**
4. See all orders to be sent ✅

### ❓ How do I track supplier balance?
1. Go to Suppliers page
2. Click on supplier card
3. See "Balance Due" and "Total Paid"
4. Click their card to see all details ✅

### ❓ How do I record a partial payment?
1. Go to Payments
2. Click "+ Record Payment"
3. Enter partial amount (e.g., ₹2500 of ₹5000 due)
4. Balance automatically reduces by that amount ✅

### ❓ Can I see payment history for a supplier?
1. Go to Payments
2. Filter by Supplier
3. See all payments with dates and amounts ✅

### ❓ What if order is cancelled?
1. Go to Purchase Orders
2. Change status to **CANCELLED**
3. Can still be deleted if needed
4. Stock NOT affected ✅

---

## Dashboard Insights

### 📊 On Suppliers Page
- **Balance Due**: Amount you owe this supplier
- **Total Paid**: Amount already paid
- **Categories**: What they supply
- **Contact Info**: Phone, email, UPI, bank details

### 📊 On Purchase Orders Page
- **Order Number**: Auto-generated (PO-YY-00001)
- **Status**: Where is your order?
- **Timeline**: When created, when expected, when received
- **Items**: What you ordered and quantities
- **Total**: How much is this order worth

### 📊 On Payments Page
- **Statistics**: Total in this view, suppliers count, total due
- **Payment History**: When, to whom, how much, method
- **Supplier Summary**: Who owes what, payment progress bars

---

## Best Practices

### ✅ DO:
- Set **Low Stock Thresholds** for all key products
- Always link a **Preferred Supplier** to products
- Update order status as goods move
- Record payments as you make them
- Use proper payment references for bank transfers
- Review supplier balances weekly

### ❌ DON'T:
- Set reorder quantity to 0
- Leave threshold unset and expect auto-orders
- Forget to mark order as DELIVERED
- Create duplicate orders for same product
- Delete orders that are already ORDERED
- Mix up supplier and product management

---

## Keyboard & Time Shortcuts

### Fast Navigation
- **Suppliers** → Ctrl+Shift+S
- **Purchase Orders** → Ctrl+Shift+P
- **Payments** → Ctrl+Shift+M

### Quick Actions
- **New Supplier** → Alt+N on Suppliers page
- **New Order** → Alt+O on Purchase Orders page
- **New Payment** → Alt+P on Payments page

---

## Common Questions

### Q: When will orders auto-create?
**A:** When `current_stock ≤ low_stock_threshold` and there's no pending order for that product.

### Q: What happens to balance_due?
**A:** It increases when order is DELIVERED, decreases when payment is recorded.

### Q: Can I create orders without a supplier?
**A:** No, every order needs a supplier selected.

### Q: What if I made a payment by mistake?
**A:** Only admins can delete payments. Contact admin to reverse.

### Q: Can suppliers supply multiple categories?
**A:** Yes! Each supplier can supply multiple categories.

### Q: How do I see which products are running low?
**A:** Go to Products page, look for red "stock-low" indicator.

---

## Support Checklist

If something isn't working:

- [ ] Refresh the page / Clear cache
- [ ] Check if you're logged in with correct role
- [ ] Verify supplier exists before creating order
- [ ] Check order status is flowing correctly
- [ ] Confirm payment amount is positive
- [ ] Check backend is running (`npm start`)
- [ ] Check MongoDB is running
- [ ] Review browser console for errors

---

## Ready to Go! 🎉

You're all set to manage suppliers professionally!

**Next Steps:**
1. ✅ Add 2-3 suppliers
2. ✅ Link suppliers to your key products
3. ✅ Set low stock thresholds
4. ✅ Create and track your first order
5. ✅ Record your first payment

Your supply chain is now centralized, tracked, and automated! 🚀

---

**Pro Tip:** Use the Supplier Module to eliminate:
- ❌ WhatsApp vendor chats
- ❌ Lost order notes
- ❌ Forgotten payments
- ❌ Manual stock tracking
- ❌ Payment confusions

Everything is now in **one place**, **fully tracked**, and **automatically updated**! ✨
