const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../models/product');
const Supplier = require('../models/supplier');

async function updateProductsWithRealNames() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 MongoDB Connected\n');

    // Get suppliers
    const suppliers = await Supplier.find({}).lean();
    if (suppliers.length === 0) {
      console.log('❌ No suppliers found!');
      process.exit(1);
    }

    // Real product data
    const realProducts = [
      { name: "Dell Laptop XPS 13", category: "Electronics", cost: 45000, selling: 55000, stock: 8, reorder: 5 },
      { name: "Apple MacBook Pro", category: "Electronics", cost: 95000, selling: 125000, stock: 5, reorder: 3 },
      { name: "HP Pavilion 15", category: "Electronics", cost: 35000, selling: 42000, stock: 12, reorder: 5 },
      { name: "Lenovo ThinkPad", category: "Electronics", cost: 50000, selling: 62000, stock: 10, reorder: 4 },
      { name: "ASUS VivoBook", category: "Electronics", cost: 40000, selling: 48000, stock: 15, reorder: 6 },
      { name: "Samsung Galaxy S24", category: "Mobile Phones", cost: 50000, selling: 65000, stock: 20, reorder: 8 },
      { name: "iPhone 15 Pro", category: "Mobile Phones", cost: 80000, selling: 110000, stock: 15, reorder: 5 },
      { name: "Google Pixel 8", category: "Mobile Phones", cost: 45000, selling: 60000, stock: 18, reorder: 7 },
      { name: "OnePlus 12", category: "Mobile Phones", cost: 42000, selling: 55000, stock: 22, reorder: 8 },
      { name: "Xiaomi 14", category: "Mobile Phones", cost: 38000, selling: 48000, stock: 25, reorder: 10 },
      { name: "Sony WH-1000XM5 Headphones", category: "Audio", cost: 25000, selling: 33000, stock: 30, reorder: 10 },
      { name: "Bose QuietComfort 45", category: "Audio", cost: 28000, selling: 38000, stock: 25, reorder: 8 },
      { name: "Apple AirPods Pro", category: "Audio", cost: 18000, selling: 25000, stock: 40, reorder: 15 },
      { name: "JBL Charge 5 Speaker", category: "Audio", cost: 12000, selling: 16000, stock: 35, reorder: 12 },
      { name: "Beats Studio Pro", category: "Audio", cost: 22000, selling: 30000, stock: 28, reorder: 10 },
      { name: "Samsung 65\" 4K TV", category: "televisions", cost: 65000, selling: 85000, stock: 6, reorder: 2 },
      { name: "LG OLED 55\" TV", category: "televisions", cost: 75000, selling: 98000, stock: 4, reorder: 2 },
      { name: "Sony Bravia 75\" TV", category: "televisions", cost: 95000, selling: 125000, stock: 3, reorder: 1 },
      { name: "TCL 43\" Smart TV", category: "televisions", cost: 35000, selling: 45000, stock: 10, reorder: 4 },
      { name: "Mi 50\" 4K TV", category: "televisions", cost: 40000, selling: 52000, stock: 12, reorder: 5 },
      { name: "Canon EOS R6 Camera", category: "Cameras", cost: 150000, selling: 190000, stock: 5, reorder: 2 },
      { name: "Sony A7R V Camera", category: "Cameras", cost: 160000, selling: 205000, stock: 4, reorder: 2 },
      { name: "Nikon Z8 Camera", category: "Cameras", cost: 155000, selling: 200000, stock: 4, reorder: 2 },
      { name: "DJI Mavic 3 Drone", category: "Drones", cost: 85000, selling: 110000, stock: 8, reorder: 3 },
      { name: "Apple iPad Air", category: "Tablets", cost: 55000, selling: 70000, stock: 14, reorder: 5 },
      { name: "Samsung Galaxy Tab S9", category: "Tablets", cost: 50000, selling: 65000, stock: 16, reorder: 6 },
      { name: "Microsoft Surface Pro 9", category: "Tablets", cost: 60000, selling: 78000, stock: 12, reorder: 4 },
      { name: "Keyboard Mechanical RGB", category: "Accessories", cost: 5000, selling: 7500, stock: 50, reorder: 20 },
      { name: "Wireless Mouse Logitech", category: "Accessories", cost: 2500, selling: 3500, stock: 80, reorder: 30 },
      { name: "USB-C Hub 7-in-1", category: "Cables & Adapters", cost: 3000, selling: 4500, stock: 60, reorder: 25 }
    ];

    console.log(`📝 Starting to update ${realProducts.length} products with real names...\n`);

    // Delete existing products
    await Product.deleteMany({});
    console.log('🗑️  Cleared existing products\n');

    // Create new products with real names
    const createdProducts = [];
    for (let i = 0; i < realProducts.length; i++) {
      const productData = realProducts[i];
      const randomSupplier = suppliers[Math.floor(Math.random() * suppliers.length)];

      const product = new Product({
        name: productData.name,
        category: productData.category,
        cost_price: productData.cost,
        selling_price: productData.selling,
        current_stock: productData.stock,
        reorder_point: productData.reorder,
        reorder_quantity: productData.reorder * 2,
        safety_stock: Math.ceil(productData.reorder / 2),
        lead_time_days: 5,
        preferred_supplier_id: randomSupplier._id,
        low_stock_threshold: productData.reorder,
        description: `Quality ${productData.category} product - ${productData.name}`,
        sku: `SKU-${String(i + 1).padStart(4, '0')}`
      });

      await product.save();
      createdProducts.push(product);
      console.log(`✅ ${i + 1}. ${product.name} (Stock: ${product.current_stock})`);
    }

    console.log(`\n✨ Successfully created ${createdProducts.length} products with real names!\n`);
    console.log('📊 Sample of updated products:');
    createdProducts.slice(0, 5).forEach(p => {
      console.log(`   - ${p.name}: ₹${p.selling_price} (Cost: ₹${p.cost_price})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateProductsWithRealNames();
