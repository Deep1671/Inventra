const mongoose = require('mongoose');
require('dotenv').config();

const SalesOrder = require('../models/salesOrder');
const Product = require('../models/product');

async function createTestSalesOrders() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 MongoDB Connected\n');

    // Get some products
    const products = await Product.find().limit(10).lean();
    if (products.length === 0) {
      console.log('❌ No products found!');
      process.exit(1);
    }

    console.log(`📦 Found ${products.length} products\n`);

    // Create 5 test sales orders with realistic data
    const testOrders = [];

    for (let i = 0; i < 5; i++) {
      // Select 1-3 random products
      const itemCount = Math.floor(Math.random() * 3) + 1;
      const selectedProducts = [];
      let totalAmount = 0;

      for (let j = 0; j < itemCount; j++) {
        const product = products[Math.floor(Math.random() * products.length)];
        const quantity = Math.floor(Math.random() * 5) + 1;
        const subtotal = quantity * product.selling_price;
        totalAmount += subtotal;

        selectedProducts.push({
          product_id: product._id,
          product_name: product.name,
          quantity: quantity,
          unit_price: product.selling_price,
          subtotal: subtotal
        });
      }

      const orderData = {
        order_number: `TEST-ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        customer_info: {
          name: `Test Customer ${i + 1}`,
          email: `customer${i + 1}@test.com`,
          phone: `+91${9000000000 + i}`,
          address: `Test Address ${i + 1}`
        },
        items: selectedProducts,
        total_amount: totalAmount,
        payment_method: 'CASH',
        status: ['DRAFT', 'CONFIRMED', 'PROCESSING', 'COMPLETED'][Math.floor(Math.random() * 4)],
        payment_status: 'PENDING',
        order_date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date in past 7 days
        notes: `Test order ${i + 1}`
      };

      testOrders.push(orderData);
    }

    // Insert test orders
    console.log('📝 Creating test SalesOrders...\n');
    const created = await SalesOrder.insertMany(testOrders);

    console.log(`✅ Created ${created.length} test SalesOrders:\n`);
    
    created.forEach((order, idx) => {
      console.log(`${idx + 1}. ${order.order_number}`);
      console.log(`   Amount: ₹${order.total_amount.toLocaleString()}`);
      console.log(`   Customer: ${order.customer_info.name}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Date: ${order.order_date.toLocaleDateString('en-IN')}`);
    });

    console.log('\n✨ Test data created successfully!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTestSalesOrders();
