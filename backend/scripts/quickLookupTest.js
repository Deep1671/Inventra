const mongoose = require('mongoose');
require('dotenv').config();

const Sale = require('../models/sale');

async function quickTest() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 MongoDB Connected\n');

    // Quick test - get first sale and its product
    const firstSale = await Sale.findOne().lean();
    if (!firstSale) {
      console.log('❌ No sales found!');
      process.exit(1);
    }

    console.log(`📊 Sample Sale:`);
    console.log(`   Product: ${firstSale.product_name}`);
    console.log(`   Product ID: ${firstSale.product_id}`);
    console.log(`   Revenue: ₹${firstSale.revenue}\n`);

    // Try simple aggregation with just one sale
    const result = await Sale.aggregate([
      { $limit: 1 },
      {
        $lookup: {
          from: "products",
          localField: "product_id",
          foreignField: "_id",
          as: "product_info"
        }
      },
      { $unwind: "$product_info" }
    ]);

    if (result.length > 0) {
      console.log('✅ Lookup successful!');
      console.log(`   Product Category: ${result[0].product_info.category}`);
      console.log(`   Product Name: ${result[0].product_info.name}`);
    } else {
      console.log('❌ Lookup failed - no result');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

quickTest();
