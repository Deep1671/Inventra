# Database Seeding Scripts 📚

Complete data seeding scripts to populate your Inventra database with sample suppliers, products, and relationships.

---

## 📋 What's Included

### 1. **Supplier Seeding** (`seedSuppliers.js`)
Creates 10 realistic suppliers with:
- Full contact information (name, phone, email)
- Business categories (Electronics, Groceries, Clothing, Books, etc.)
- Complete addresses (street, city, state)
- Bank details (account, IFSC code, bank name)
- UPI payment IDs
- Balance and payment tracking setup

**Suppliers Created:**
1. TechElectronics Wholesale (Electronics, Computers)
2. Fresh Foods & Groceries (Groceries, Vegetables, Fruits)
3. Fashion & Apparel Trading (Clothing, Apparels, Shoes)
4. Bookeaven Publications (Books, Stationery, Educational)
5. Premium Furniture Solutions (Furniture, Home Decor, Office)
6. Organic Wellness Center (Health, Wellness, Organic)
7. Industrial Hardware Co (Hardware, Tools, Industrial)
8. Global Imports Trading (Imports, Electronics, Cosmetics)
9. Swift Logistics & Supply (Groceries, Electronics, General)
10. Artisan Crafts & Gifts (Gifts, Home Decor, Handicrafts)

### 2. **Product Seeding** (`seedProducts.js`)
Links suppliers to products with:
- 10 realistic products across different categories
- Existing products get supplier links automatically
- Low stock thresholds configured per product
- Reorder quantities pre-calculated
- Stock levels with some products already low (to test auto-ordering)

**Sample Products:**
- Dell XPS 13 Laptop → TechElectronics
- MacBook Pro → TechElectronics
- Organic Basmati Rice → Fresh Foods
- Fresh Tomatoes → Fresh Foods
- Cotton T-Shirt Pack → Fashion & Apparel
- Denim Jeans (LOW STOCK) → Fashion & Apparel
- Grammar Book → Bookeaven
- Executive Chair → Premium Furniture
- Standing Desk (LOW STOCK) → Premium Furniture
- Organic Green Tea → Organic Wellness

---

## 🚀 How to Use

### Prerequisites
- Backend server must be running: `npm start`
- MongoDB must be running
- `.env` file must have `MONGO_URI` configured

### Option 1: Seed Only Suppliers
```bash
cd backend
npm run seed:suppliers
```

**Output:**
```
🔗 MongoDB Connected
📝 Inserting sample suppliers...
✅ Successfully created 10 suppliers
📊 Suppliers Created:
1. TechElectronics Wholesale
   📧 sales@techelectronics.com
   ...
✨ Data seeding completed successfully!
```

### Option 2: Seed Only Products
```bash
cd backend
npm run seed:products
```

**Prerequisites:** Suppliers must exist first!

**Output:**
```
🔗 MongoDB Connected
✅ Found 10 suppliers
✅ Found X existing products
🔄 Linking suppliers to products...
✅ Updated X products with supplier links
```

### Option 3: Seed Everything (Recommended)
```bash
cd backend
npm run seed:all
```

This will:
1. Create all 10 suppliers
2. Create all 10 sample products
3. Link products to their respective suppliers

---

## ⚠️ Important Notes

### Preventing Duplicate Data
```bash
# First run - creates fresh data
npm run seed:suppliers

# Subsequent runs - Won't overwrite by default
npm run seed:suppliers
# ℹ️ Database already has 10 suppliers
# Use 'npm run seed:suppliers -- --force' to clear and reseed

# Force re-seed (deletes existing, creates fresh)
npm run seed:suppliers -- --force
```

### After Seeding

Once data is seeded, you can immediately:

1. **View Suppliers**
   - Go to Suppliers page
   - See all 10 suppliers listed
   - View contact and payment details

2. **Check Products**
   - Go to Products page
   - Some products show RED stock indicator (low stock)
   - Try editing a product to see supplier link

3. **Test Low Stock Detection**
   - Products: Denim Jeans, Standing Desk have low stock
   - Can manually create purchase orders
   - Can test auto-order generation

4. **Create Orders**
   - Go to Purchase Orders
   - Create order for low stock items
   - Track status: PENDING → ORDERED → DELIVERED

5. **Record Payments**
   - Go to Payments
   - Record payment for suppliers
   - See balance automatically update

---

## 🔍 Data Structure Reference

### Supplier Record
```javascript
{
  name: "TechElectronics Wholesale",
  phone: "9876543210",
  email: "sales@techelectronics.com",
  categories: ["Electronics", "Computers"],
  address: "Block A, Industrial Park, Unit 102",
  city: "Bangalore",
  state: "Karnataka",
  bank_details: {
    account_holder: "TechElectronics Ltd",
    account_number: "9876543210123456",
    ifsc_code: "ICIC0000001",
    bank_name: "ICICI Bank"
  },
  upi_id: "techelectronics@upi",
  notes: "Preferred supplier for laptops and desktops",
  balance_due: 0,
  total_paid: 0,
  is_active: true
}
```

### Product Record (Updated with Supplier)
```javascript
{
  name: "Dell Laptop XPS 13",
  category: "Electronics",
  cost_price: 45000,
  selling_price: 55000,
  current_stock: 8,
  safety_stock: 3,
  reorder_point: 5,
  lead_time_days: 5,
  preferred_supplier_id: "[Supplier ID]",
  low_stock_threshold: 5,
  reorder_quantity: 10
}
```

---

## ✅ Verification Checklist

After running seed scripts:

- [ ] Check Suppliers page - should show 10 suppliers
- [ ] Check each supplier has email, phone, categories
- [ ] Check Products page - products show supplier links
- [ ] Check some products show RED stock (low) indicator
- [ ] Edit a low-stock product - see supplier dropdown populated
- [ ] Try searching suppliers by category
- [ ] Verify purchase order creation works
- [ ] Create an order for low stock item
- [ ] Mark order as DELIVERED - stock should increase
- [ ] Record payment - balance should decrease

---

## 🐛 Troubleshooting

### Error: "No suppliers found"
```
❌ No suppliers found! Please run seed:suppliers first
   npm run seed:suppliers
```
**Solution:** Run supplier seed first before product seed.

### Error: "MongoDB connection failed"
```
❌ Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:** 
- Start MongoDB: `mongod`
- Check MONGO_URI in .env file

### Error: "Duplicate email"
```
❌ E11000 duplicate key error
```
**Solution:** 
- Use `-- --force` flag to clear and reseed
- `npm run seed:suppliers -- --force`

### Products don't show suppliers in dropdown
```
Solution:
- Clear browser cache
- Refresh Products page
- Make sure seed:products was run after seed:suppliers
```

---

## 📊 Sample Test Scenarios

### Test Auto-Order Generation
1. Seed suppliers and products
2. Go to Products page
3. Find "Denim Jeans" (should have 4 stock, threshold 3)
4. Go to Purchase Orders → Auto-create endpoint
5. Should create order for Denim Jeans from Fashion & Apparel

### Test Order Workflow
1. Create new order for "Denim Jeans"
2. Status: PENDING
3. Click "Mark as Ordered" → Status: ORDERED
4. Click "Mark as Delivered" → Status: DELIVERED
5. Check Products page → Stock should be 4 + reorder_qty

### Test Payment Tracking
1. Go to Payments
2. Record payment for "Fashion & Apparel Trading"
3. Check Suppliers page → Balance due should decrease
4. View payment history for that supplier

---

## 🔧 Customizing Seed Data

### Add More Suppliers
Edit `seedSuppliers.js`, add to `sampleSuppliers` array:
```javascript
{
  name: "Your Supplier Name",
  phone: "9999999999",
  email: "contact@yoursupplier.com",
  categories: ["Category1", "Category2"],
  // ... other fields
}
```

### Add More Products
Edit `seedProducts.js`, add to sample products:
```javascript
{
  name: "Your Product",
  category: "Electronics",
  cost_price: 1000,
  selling_price: 1500,
  current_stock: 10,
  reorder_point: 5,
  // ... other fields
}
```

---

## 📝 Seed Script Format

Both scripts follow the same pattern:

1. **Connect to MongoDB**
   - Use MONGO_URI from .env
   - Verify connection

2. **Check Existing Data**
   - Count existing records
   - Warn if data exists
   - Offer --force option

3. **Insert Sample Data**
   - Create new records
   - Handle errors

4. **Display Summary**
   - Show created records
   - List key information
   - Provide next steps

5. **Exit Gracefully**
   - Clean exit on success
   - Error exit on failure

---

## 🎯 Next Steps After Seeding

1. **Explore Suppliers Page**
   - View all suppliers
   - Check categories
   - See bank details

2. **Link More Products**
   - Edit more products
   - Assign suppliers
   - Set thresholds

3. **Create Purchase Orders**
   - Manual creation
   - Test status workflow
   - Track deliveries

4. **Record Payments**
   - Test payment methods
   - Verify balance updates
   - Check payment history

5. **Test Automation**
   - Adjust stock levels
   - Test auto-order trigger
   - Monitor order creation

---

## 📞 Support

For issues with seeding:

1. Check MongoDB is running
2. Verify .env MONGO_URI is correct
3. Check backend server is running
4. Review error messages carefully
5. Try `--force` to clear and reseed

---

**Version:** 1.0.0  
**Last Updated:** March 2026  
**Status:** Ready to Use ✅
