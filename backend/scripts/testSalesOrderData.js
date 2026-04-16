const mongoose = require('mongoose');
require('dotenv').config();

const SalesOrder = require('../models/salesOrder');

async function testSalesOrderData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 MongoDB Connected\n');

    // Get first 5 sales orders
    const orders = await SalesOrder.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    console.log(`📊 Total SalesOrders in DB:\n`);
    
    orders.forEach((order, idx) => {
      console.log(`${idx + 1}. Order: ${order.order_number}`);
      console.log(`   Total Amount: ${order.total_amount}`);
      console.log(`   Order Date: ${order.order_date}`);
      console.log(`   Created At: ${order.createdAt}`);
      console.log(`   Customer: ${order.customer_info?.name || 'N/A'}`);
      console.log(`   Status: ${order.status}`);
      console.log('   ---\n');
    });

    // Test the getSalesOrders response format
    console.log('🧪 Testing getSalesOrders Response Format:\n');
    
    const formatted = orders.map(order => ({
      _id: order._id,
      order_number: order.order_number,
      customer_name: order.customer_info.name,
      customer_info: order.customer_info,
      total_amount: order.total_amount,
      status: order.status,
      order_date: order.order_date,
      createdAt: order.createdAt,
      type: order.is_single_item ? 'Quick Sale' : 'Sales Order'
    }));

    console.log('Response format:');
    console.log(JSON.stringify(formatted[0], null, 2));

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testSalesOrderData();
