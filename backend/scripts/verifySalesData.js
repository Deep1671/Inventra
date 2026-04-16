const mongoose = require('mongoose');
require('dotenv').config();

const Sale = require('../models/sale');

async function verifySalesData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 MongoDB Connected\n');

    const salesCount = await Sale.countDocuments();
    console.log(`📊 Total Sales: ${salesCount}\n`);

    if (salesCount > 0) {
      // Get sample sales
      const samples = await Sale.find().limit(3).lean();
      console.log('📝 Sample Sales:');
      samples.forEach((s, i) => {
        console.log(`${i + 1}. Product: ${s.product_name} - Revenue: ₹${s.revenue} - Product ID: ${s.product_id}`);
      });

      // Test aggregation with category lookup - exactly like the endpoint does
      console.log('\n🧪 Testing Category Lookup Aggregation:\n');
      const categories = await Sale.aggregate([
        {
          $lookup: {
            from: "products",
            let: { product_id: "$product_id" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$product_id"] } } },
              { $project: { category: 1, cost_price: 1 } }
            ],
            as: "product_info"
          }
        },
        { $unwind: { path: "$product_info", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: "$product_info.category",
            total_revenue: { $sum: "$revenue" },
            total_quantity: { $sum: "$quantity_sold" },
            sales_count: { $sum: 1 }
          }
        },
        { $sort: { total_revenue: -1 } }
      ]);

      console.log(`📋 Found ${categories.length} categories:\n`);
      categories.forEach(c => {
        console.log(`   ${c._id || 'Undefined'}: ₹${c.total_revenue} revenue (${c.sales_count} sales)`);
      });
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifySalesData();
