const mongoose = require('mongoose');
const Product = require('../models/product');

mongoose.connect('mongodb://localhost:27017/smart_inventory');

mongoose.connection.once('open', async () => {
  try {
    console.log('\n📦 CURRENT PRODUCTS IN DATABASE:\n');
    const products = await Product.find({}).select('_id name category current_stock').lean();
    console.log(`Total Products: ${products.length}\n`);
    products.forEach((p, i) => {
      console.log(`${i + 1}. ID: ${p._id} | Name: ${p.name} | Category: ${p.category || 'N/A'} | Stock: ${p.current_stock}`);
    });
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
});
