require("dotenv").config();
const mongoose = require("mongoose");

const Supplier = require("../models/supplier");
const Product = require("../models/product");
const PurchaseOrder = require("../models/purchaseOrder");
const Payment = require("../models/payment");

async function createTestData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("🔗 MongoDB Connected");

    // Get suppliers and products
    const suppliers = await Supplier.find().limit(5);
    const products = await Product.find().limit(10);

    if (suppliers.length === 0 || products.length === 0) {
      console.log("❌ No suppliers or products found. Please seed them first.");
      process.exit(1);
    }

    console.log(`✅ Found ${suppliers.length} suppliers and ${products.length} products`);

    // Create purchase orders
    console.log("\n📝 Creating Purchase Orders...");
    const purchaseOrders = [];
    
    for (let i = 0; i < 5; i++) {
      const supplier = suppliers[i % suppliers.length];
      const productCount = Math.floor(Math.random() * 3) + 1;
      const items = [];
      let totalAmount = 0;

      for (let j = 0; j < productCount; j++) {
        const product = products[Math.floor(Math.random() * products.length)];
        const quantity = Math.floor(Math.random() * 50) + 5;
        const unitPrice = product.cost_price || 1000;
        const itemTotal = quantity * unitPrice;
        totalAmount += itemTotal;

        items.push({
          product_id: product._id,
          product_name: product.name,
          quantity,
          unit_price: unitPrice,
          total: itemTotal,
        });
      }
      
      const po = new PurchaseOrder({
        order_number: `PO-${Date.now()}-${i}`,
        supplier_id: supplier._id,
        items,
        total_amount: totalAmount,
        status: ["PENDING", "ORDERED", "DELIVERED"][Math.floor(Math.random() * 3)],
        notes: `Test PO #${i + 1}`,
        expected_delivery_date: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
      });

      await po.save();
      purchaseOrders.push(po);
      console.log(`✅ Created PO: ${po.order_number}`);
    }

    // Create payments
    console.log("\n💳 Creating Payments...");
    const payments = [];

    for (let i = 0; i < 8; i++) {
      const supplier = suppliers[i % suppliers.length];
      const payment = new Payment({
        supplier_id: supplier._id,
        amount: Math.floor(Math.random() * 100000) + 10000,
        payment_method: ["BANK_TRANSFER", "CHEQUE", "CASH", "UPI"][Math.floor(Math.random() * 4)],
        reference_number: `REF-${Date.now()}-${i}`,
        status: ["PENDING", "COMPLETED", "FAILED"][Math.floor(Math.random() * 3)],
        notes: `Test payment ${i + 1}`,
      });

      await payment.save();
      payments.push(payment);
      console.log(`✅ Created Payment: ${payment._id}`);
    }

    console.log(`\n✨ Test data created successfully!`);
    console.log(`📊 Summary:`);
    console.log(`   - Purchase Orders: ${purchaseOrders.length}`);
    console.log(`   - Payments: ${payments.length}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

createTestData();
