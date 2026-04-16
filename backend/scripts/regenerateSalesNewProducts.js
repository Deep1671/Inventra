const mongoose = require('mongoose');
require('dotenv').config();

const Sale = require('../models/sale');
const Product = require('../models/product');

async function regenerateSalesWithNewProducts() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 MongoDB Connected\n');

    // Get all products
    const products = await Product.find().lean();
    if (products.length === 0) {
      console.log('❌ No products found!');
      process.exit(1);
    }

    console.log(`📦 Found ${products.length} products\n`);
    console.log('🗑️  Clearing old sales data...\n');
    await Sale.deleteMany({});

    // Generate realistic sales data for the past year
    const generatedSales = [];
    const startDate = new Date(2024, 0, 1); // Jan 1, 2024
    const endDate = new Date(); // Today

    // Generate ~2-3 sales per day per category
    const daysRange = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
    const salesPerDay = 25; // ~600 sales per month
    let totalSales = 0;

    for (let i = 0; i < daysRange * salesPerDay; i++) {
      const randomProduct = products[Math.floor(Math.random() * products.length)];
      const randomDate = new Date(
        startDate.getTime() + Math.random() * (endDate - startDate)
      );

      // Random quantity between 1-20 units
      const quantity = Math.floor(Math.random() * 20) + 1;
      const revenue = quantity * randomProduct.selling_price;
      const cost = quantity * randomProduct.cost_price;

      generatedSales.push({
        product_id: randomProduct._id,
        product_name: randomProduct.name,
        quantity_sold: quantity,
        revenue: revenue,
        createdAt: randomDate
      });

      totalSales++;
      if (totalSales % 500 === 0) {
        console.log(`   Generated ${totalSales} sales...`);
      }
    }

    console.log(`\n✅ Total sales to insert: ${generatedSales.length}\n`);

    // Insert in batches
    const batchSize = 1000;
    for (let i = 0; i < generatedSales.length; i += batchSize) {
      const batch = generatedSales.slice(i, i + batchSize);
      await Sale.insertMany(batch);
      console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(generatedSales.length / batchSize)}`);
    }

    // Get statistics
    const salesCount = await Sale.countDocuments();
    const categories = await Sale.distinct('category');
    
    console.log(`\n✨ Successfully regenerated sales data!\n`);
    console.log(`📊 Total Sales: ${salesCount}`);
    console.log(`📋 Categories: ${categories.length}`);
    console.log(`   ${categories.join(', ')}`);

    // Sample sales by category
    console.log(`\n📈 Sample by Category:`);
    for (const cat of categories.slice(0, 5)) {
      const count = await Sale.countDocuments({ category: cat });
      const revenue = await Sale.aggregate([
        { $match: { category: cat } },
        { $group: { _id: null, total: { $sum: '$revenue' } } }
      ]);
      console.log(`   ${cat}: ${count} sales, ₹${revenue[0]?.total || 0} revenue`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

regenerateSalesWithNewProducts();
