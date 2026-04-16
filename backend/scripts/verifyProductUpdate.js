const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../models/product');

async function verifyProducts() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 MongoDB Connected\n');

    // Get all products
    const products = await Product.find().lean();
    console.log(`✅ Total Products Found: ${products.length}\n`);

    if (products.length > 0) {
      console.log('📝 Sample Products:');
      products.slice(0, 10).forEach((p, idx) => {
        console.log(`   ${idx + 1}. ${p.name} - Category: ${p.category} - Price: ₹${p.selling_price}`);
      });
      
      console.log(`\n💰 Price Range Verification:`);
      const avgPrice = products.reduce((sum, p) => sum + p.selling_price, 0) / products.length;
      console.log(`   Average Selling Price: ₹${Math.round(avgPrice)}`);
      console.log(`   Min: ₹${Math.min(...products.map(p => p.selling_price))}`);
      console.log(`   Max: ₹${Math.max(...products.map(p => p.selling_price))}`);

      console.log(`\n📊 Products by Category:`);
      const categories = {};
      products.forEach(p => {
        categories[p.category] = (categories[p.category] || 0) + 1;
      });
      Object.entries(categories).forEach(([cat, count]) => {
        console.log(`   ${cat}: ${count} products`);
      });
    } else {
      console.log('❌ No products found in database!');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyProducts();
