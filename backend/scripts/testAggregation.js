const mongoose = require('mongoose');
require('dotenv').config();

const Sale = require('../models/sale');
const SalesOrder = require('../models/salesOrder');
const Product = require('../models/product');

async function testAggregation() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 MongoDB Connected\n');

    // Get count of sales and sales orders
    const saleCount = await Sale.countDocuments();
    const sopCount = await SalesOrder.countDocuments();
    console.log(`📊 Sales Records: ${saleCount}`);
    console.log(`📊 Sales Orders: ${sopCount}\n`);

    // Test the exact aggregation from /top-products endpoint
    console.log('🧪 Testing TOP PRODUCTS Aggregation Pipeline:\n');
    
    const topProducts = await Sale.aggregate([
      {
        $match: {
          created_at: {
            $gte: new Date('2024-01-01'),
            $lt: new Date('2024-12-31')
          }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'product_id',
          foreignField: '_id',
          as: 'product_info'
        }
      },
      {
        $unwind: {
          path: '$product_info',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: '$product_id',
          product_name: { $first: '$product_info.name' },
          quantity_sold: { $sum: '$quantity' },
          total_revenue: { $sum: { $multiply: ['$quantity', '$selling_price'] } },
          avg_price: { $avg: '$selling_price' }
        }
      },
      { $sort: { quantity_sold: -1 } },
      { $limit: 5 }
    ]).exec();

    console.log('✅ Top 5 Products by Quantity:\n');
    if (topProducts.length > 0) {
      topProducts.forEach((p, idx) => {
        console.log(`${idx + 1}. ${p.product_name || '❌ NULL'}`);
        console.log(`   Quantity: ${p.quantity_sold}`);
        console.log(`   Revenue: ₹${Math.round(p.total_revenue)}\n`);
      });
    } else {
      console.log('❌ No products in aggregation result!');
      console.log('⚠️  This means sales may not exist or date range is off');
    }

    // Test with SalesOrder
    console.log('\n🧪 Testing Sales Order Aggregation:\n');
    
    const topOrderProducts = await SalesOrder.aggregate([
      {
        $match: {
          order_date: {
            $gte: new Date('2024-01-01'),
            $lt: new Date('2024-12-31')
          }
        }
      },
      {
        $unwind: '$products'
      },
      {
        $lookup: {
          from: 'products',
          localField: 'products.product_id',
          foreignField: '_id',
          as: 'product_info'
        }
      },
      {
        $unwind: {
          path: '$product_info',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: '$products.product_id',
          product_name: { $first: '$product_info.name' },
          quantity_sold: { $sum: '$products.quantity' }
        }
      },
      { $sort: { quantity_sold: -1 } },
      { $limit: 5 }
    ]).exec();

    console.log('✅ Top 5 Products from Sales Orders:\n');
    if (topOrderProducts.length > 0) {
      topOrderProducts.forEach((p, idx) => {
        console.log(`${idx + 1}. ${p.product_name || '❌ NULL'}`);
        console.log(`   Quantity: ${p.quantity_sold}\n`);
      });
    } else {
      console.log('❌ No sales orders found in date range!');
    }

    // Check all products exist in database
    console.log('🧪 Direct Product Query:\n');
    const allProducts = await Product.find().select('name category selling_price').limit(5).lean();
    console.log('✅ Sample Products from DB:\n');
    allProducts.forEach((p, idx) => {
      console.log(`${idx + 1}. ${p.name}`);
    });

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testAggregation();
