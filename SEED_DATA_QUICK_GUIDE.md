# 🚀 Quick Seed Data Commands

Copy and paste these commands in your terminal:

---

## ✅ STEP 1: Make sure backend is running in a separate terminal

```bash
cd backend
npm start
```

Keep this terminal open! ⬆️

---

## ✅ STEP 2: In a NEW terminal, seed your database

**Open a NEW terminal window and run:**

### Command 1: Seed Suppliers (10 suppliers)
```bash
cd backend
npm run seed:suppliers
```

**Wait for it to complete** ✅

---

### Command 2: Seed Products (10 products + link to suppliers)
```bash
cd backend
npm run seed:products
```

**Wait for it to complete** ✅

---

### OR: Do Both at Once
```bash
cd backend
npm run seed:all
```

This does everything in one command!

---

## 📊 Expected Output

```
🔗 MongoDB Connected
📝 Inserting sample suppliers...
✅ Successfully created 10 suppliers

📊 Suppliers Created:
1. TechElectronics Wholesale
   📧 sales@techelectronics.com
   📱 9876543210
   🏷️  Categories: Electronics, Computers
   📍 Bangalore, Karnataka

2. Fresh Foods & Groceries
   ...
   
✨ Data seeding completed successfully!
```

---

## 🔄 If You Want to RESET and Reseed

```bash
cd backend
npm run seed:suppliers -- --force
npm run seed:products
```

---

## ✨ After Seeding

1. Go to **Suppliers** page → See all 10 suppliers ✅
2. Go to **Products** page → See linked suppliers ✅
3. Go to **Purchase Orders** → Create orders ✅
4. Go to **Payments** → Record payments ✅

---

## ⚠️ That's It!

Your database now has:
- ✅ 10 Suppliers with full details
- ✅ 10 Products linked to suppliers
- ✅ Low stock thresholds configured
- ✅ Reorder quantities set
- ✅ Some products with RED (low stock) indicator

**Ready to use immediately!** 🎉

---

## 🆘 Troubleshooting

### Issue: "MONGO_URI not found"
**Solution:** Check your `.env` file has:
```
MONGO_URI=mongodb://localhost:27017/inventra
```

### Issue: "No suppliers found"
**Solution:** Run `npm run seed:suppliers` first!

### Issue: "Port 5000 already in use"
**Solution:** Kill the process or use different port in .env

### Issue: Data won't update
**Solution:** Refresh browser page completely (Ctrl+Shift+R)

---

**All set! Enjoy your data! 🚀**
