const mongoose = require('mongoose');
const Product = require('../models/product');
const { LowStockAlert } = require('../models/inventory');
require('dotenv').config();

const generateLowStockAlerts = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find all products that are below reorder point
    const lowStockProducts = await Product.find({
      $expr: { $lte: ["$current_stock", "$reorder_point"] }
    });

    console.log(`Found ${lowStockProducts.length} products below reorder point:`);

    for (const product of lowStockProducts) {
      console.log(`- ${product.name}: stock=${product.current_stock}, reorder=${product.reorder_point}`);
      
      // Check if alert already exists for this product
      const existingAlert = await LowStockAlert.findOne({
        product_id: product._id,
        alert_status: "ACTIVE"
      });

      if (existingAlert) {
        console.log(`  → Alert already exists, skipping`);
        continue;
      }

      // Create low stock alert
      const alert = new LowStockAlert({
        product_id: product._id,
        product_name: product.name,
        current_stock: product.current_stock,
        reorder_point: product.reorder_point,
        reorder_quantity: product.reorder_quantity || product.reorder_point * 2,
        preferred_supplier_id: product.preferred_supplier_id
      });

      await alert.save();
      console.log(`  → Created low stock alert`);
    }

    // Show summary
    const totalAlerts = await LowStockAlert.countDocuments({ alert_status: "ACTIVE" });
    console.log(`\n✅ Total active low stock alerts: ${totalAlerts}`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error generating low stock alerts:', error);
    process.exit(1);
  }
};

// Run the script
generateLowStockAlerts();