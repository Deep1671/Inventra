const mongoose = require('mongoose');
const Product = require('../models/product');
const Sale = require('../models/sale');
const SalesOrder = require('../models/salesOrder');
require('dotenv').config();

async function testData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Check products
    const products = await Product.find({}).limit(5).lean();
    console.log('\n=== Sample Products ===');
    products.forEach(p => {
      console.log(`${p.name}: cost=${p.cost_price}, sell=${p.selling_price}, stock=${p.current_stock}`);
    });

    // Check sales
    const sales = await Sale.find({}).limit(3).lean();
    console.log('\n=== Sample Sales ===');
    sales.forEach(s => {
      console.log(`${s.product_name}: qty=${s.quantity_sold}, revenue=${s.revenue}, cost=${s.cost_price}`);
    });

    // Check sales orders
    const orders = await SalesOrder.find({}).limit(2).lean();
    console.log('\n=== Sample Sales Orders ===');
    orders.forEach(o => {
      if (o.items && o.items.length > 0) {
        console.log(`Order ${o._id}: ${o.items[0].product_name} qty=${o.items[0].quantity}, subtotal=${o.items[0].subtotal}`);
      }
    });

    await mongoose.connection.close();
    console.log('\nDatabase check complete.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

testData();
