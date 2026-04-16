const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../models/product');
const Supplier = require('../models/supplier');

async function addMoreProducts() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 MongoDB Connected\n');

    // Get suppliers
    const suppliers = await Supplier.find({}).lean();
    if (suppliers.length === 0) {
      console.log('❌ No suppliers found!');
      process.exit(1);
    }

    // Additional 10 products to reach 107
    const additionalProducts = [
      { name: "Samsung 34 Ultrawide Monitor", category: "Monitors", cost: 35000, selling: 48000, stock: 14 },
      { name: "LG 27 4K IPS Monitor", category: "Monitors", cost: 28000, selling: 38000, stock: 18 },
      { name: "Dell UltraSharp 40", category: "Monitors", cost: 85000, selling: 115000, stock: 5 },
      { name: "Asus Gaming Monitor 240Hz", category: "Monitors", cost: 32000, selling: 42000, stock: 16 },
      { name: "BenQ PD2700U Photo", category: "Monitors", cost: 45000, selling: 60000, stock: 12 },
      { name: "Corsair Gaming Desk", category: "Furniture", cost: 22000, selling: 30000, stock: 20 },
      { name: "Herman Miller Chair", category: "Furniture", cost: 45000, selling: 62000, stock: 10 },
      { name: "Autonomous Stand Desk", category: "Furniture", cost: 35000, selling: 48000, stock: 15 },
      { name: "RGB Fan Set 3 Pack", category: "PC Components", cost: 3500, selling: 5200, stock: 100 },
      { name: "RTX 4080 Graphics Card", category: "PC Components", cost: 55000, selling: 72000, stock: 8 },
    ];

    console.log(`📝 Adding ${additionalProducts.length} more products...\n`);

    for (let i = 0; i < additionalProducts.length; i++) {
      const productData = additionalProducts[i];
      const randomSupplier = suppliers[Math.floor(Math.random() * suppliers.length)];

      const product = new Product({
        name: productData.name,
        category: productData.category,
        cost_price: productData.cost,
        selling_price: productData.selling,
        current_stock: productData.stock,
        reorder_point: Math.max(2, Math.ceil(productData.stock / 2)),
        reorder_quantity: Math.ceil(productData.stock) * 2,
        safety_stock: Math.ceil(productData.stock / 3),
        lead_time_days: 5,
        preferred_supplier_id: randomSupplier._id,
        low_stock_threshold: Math.ceil(productData.stock / 2),
        description: `Quality ${productData.category} product - ${productData.name}`,
        sku: `SKU-${String(97 + i + 1).padStart(4, '0')}`
      });

      await product.save();
      console.log(`✅ ${97 + i + 1}. ${product.name}`);
    }

    // Get total count
    const totalCount = await Product.countDocuments();
    console.log(`\n✨ Total products in database: ${totalCount}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addMoreProducts();
