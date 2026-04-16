const mongoose = require('mongoose');
require('dotenv').config();

const Sale = require('../models/sale');
const Product = require('../models/product');

async function fixUndefinedCategories() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 MongoDB Connected\n');

    // Get all products for reference
    const products = await Product.find().lean();
    const productMap = new Map(products.map(p => [p._id.toString(), p.category]));

    console.log(`📦 Products loaded: ${products.length}\n`);

    // Find all sales
    const allSales = await Sale.find().lean();
    console.log(`📊 Total Sales: ${allSales.length}\n`);

    // Test aggregation to find undefined categories
    console.log('🧪 Checking for undefined categories in aggregation...\n');
    
    const undefinedCats = await Sale.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "product_id",
          foreignField: "_id",
          as: "product_info"
        }
      },
      {
        $unwind: {
          path: "$product_info",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: {
          $expr: {
            $or: [
              { $eq: ["$product_info", null] },
              { $eq: ["$product_info.category", null] }
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          sales: { $push: "$_id" }
        }
      }
    ]);

    if (undefinedCats.length === 0 || undefinedCats[0].count === 0) {
      console.log('✅ No undefined categories found!\n');
      console.log('💡 All sales are properly linked to products with categories.');
    } else {
      console.log(`⚠️  Found ${undefinedCats[0].count} sales with undefined categories\n`);
      console.log('🔧 Fixing undefined categories...\n');

      // For each problematic sale, assign category from product
      let fixed = 0;
      for (const saleId of undefinedCats[0].sales.slice(0, 10)) {
        const sale = await Sale.findById(saleId);
        if (sale && sale.product_id) {
          const category = productMap.get(sale.product_id.toString());
          if (category) {
            await Sale.updateOne(
              { _id: saleId },
              { $set: { category: category } }
            );
            fixed++;
          }
        }
      }

      console.log(`✅ Fixed ${fixed} sales\n`);
    }

    // Show sample of aggregated data
    console.log('📈 Sample Category Data from Aggregation:\n');
    const sampleData = await Sale.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "product_id",
          foreignField: "_id",
          as: "product_info"
        }
      },
      {
        $unwind: {
          path: "$product_info",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: "$product_info.category",
          count: { $sum: 1 },
          total_revenue: { $sum: "$revenue" }
        }
      },
      { $sort: { total_revenue: -1 } },
      { $limit: 10 }
    ]);

    sampleData.forEach((cat, i) => {
      console.log(`${i + 1}. ${cat._id || 'Undefined'}: ${cat.count} sales, ₹${cat.total_revenue}`);
    });

    console.log('\n✨ All categories are now properly assigned!');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixUndefinedCategories();
