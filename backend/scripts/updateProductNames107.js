const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../models/product');
const Supplier = require('../models/supplier');

async function updateProductsWithRealNames() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 MongoDB Connected\n');

    // Get suppliers
    const suppliers = await Supplier.find({}).lean();
    if (suppliers.length === 0) {
      console.log('❌ No suppliers found!');
      process.exit(1);
    }

    // Real product data - 107 products
    const realProducts = [
      // Laptops (15)
      { name: "Dell Latitude 5540", category: "Laptops", cost: 45000, selling: 55000, stock: 8 },
      { name: "Apple MacBook Pro 14", category: "Laptops", cost: 95000, selling: 125000, stock: 5 },
      { name: "HP EliteBook G10", category: "Laptops", cost: 50000, selling: 62000, stock: 10 },
      { name: "Lenovo ThinkPad X1", category: "Laptops", cost: 52000, selling: 65000, stock: 9 },
      { name: "ASUS Vivobook 16", category: "Laptops", cost: 40000, selling: 48000, stock: 15 },
      { name: "MSI GE76 Gaming", category: "Laptops", cost: 75000, selling: 95000, stock: 6 },
      { name: "Acer Swift 3", category: "Laptops", cost: 38000, selling: 46000, stock: 12 },
      { name: "ROG Zephyrus G14", category: "Laptops", cost: 85000, selling: 110000, stock: 4 },
      { name: "Dell XPS 15", category: "Laptops", cost: 88000, selling: 115000, stock: 5 },
      { name: "MacBook Air M2", category: "Laptops", cost: 72000, selling: 95000, stock: 8 },
      { name: "HP Pavilion 15", category: "Laptops", cost: 35000, selling: 42000, stock: 12 },
      { name: "Lenovo Yoga 9i", category: "Laptops", cost: 55000, selling: 70000, stock: 7 },
      { name: "Dell Inspiron 15", category: "Laptops", cost: 32000, selling: 38000, stock: 18 },
      { name: "ASUS TUF Gaming F17", category: "Laptops", cost: 65000, selling: 85000, stock: 8 },
      { name: "Razer Blade 15", category: "Laptops", cost: 92000, selling: 120000, stock: 3 },
      
      // Smartphones (18)
      { name: "Samsung Galaxy S24", category: "Smartphones", cost: 50000, selling: 65000, stock: 20 },
      { name: "iPhone 15 Pro", category: "Smartphones", cost: 80000, selling: 110000, stock: 15 },
      { name: "Google Pixel 8", category: "Smartphones", cost: 45000, selling: 60000, stock: 18 },
      { name: "OnePlus 12", category: "Smartphones", cost: 42000, selling: 55000, stock: 22 },
      { name: "Xiaomi 14 Ultra", category: "Smartphones", cost: 38000, selling: 48000, stock: 25 },
      { name: "Oppo Find X7", category: "Smartphones", cost: 40000, selling: 52000, stock: 20 },
      { name: "Vivo X100", category: "Smartphones", cost: 35000, selling: 45000, stock: 24 },
      { name: "Samsung Galaxy A54", category: "Smartphones", cost: 25000, selling: 32000, stock: 35 },
      { name: "iPhone 15", category: "Smartphones", cost: 70000, selling: 95000, stock: 20 },
      { name: "Motorola Edge 50", category: "Smartphones", cost: 28000, selling: 36000, stock: 30 },
      { name: "Samsung S24 Ultra", category: "Smartphones", cost: 85000, selling: 115000, stock: 10 },
      { name: "Pixel 8 Pro", category: "Smartphones", cost: 65000, selling: 88000, stock: 12 },
      { name: "OnePlus 12R", category: "Smartphones", cost: 32000, selling: 42000, stock: 28 },
      { name: "Xiaomi 13", category: "Smartphones", cost: 30000, selling: 39000, stock: 32 },
      { name: "Realme 12", category: "Smartphones", cost: 22000, selling: 28000, stock: 40 },
      { name: "Oppo A78", category: "Smartphones", cost: 18000, selling: 23000, stock: 45 },
      { name: "Nothing Phone 2", category: "Smartphones", cost: 28000, selling: 37000, stock: 26 },
      { name: "Honor 90", category: "Smartphones", cost: 26000, selling: 34000, stock: 29 },
      
      // Audio Equipment (12)
      { name: "Sony WH-1000XM5", category: "Audio", cost: 25000, selling: 33000, stock: 30 },
      { name: "Bose QuietComfort 45", category: "Audio", cost: 28000, selling: 38000, stock: 25 },
      { name: "Apple AirPods Pro 2", category: "Audio", cost: 18000, selling: 25000, stock: 40 },
      { name: "JBL Charge 5", category: "Audio", cost: 12000, selling: 16000, stock: 35 },
      { name: "Beats Studio Pro", category: "Audio", cost: 22000, selling: 30000, stock: 28 },
      { name: "Sennheiser HD 660S", category: "Audio", cost: 35000, selling: 48000, stock: 15 },
      { name: "Audio-Technica M50x", category: "Audio", cost: 15000, selling: 20000, stock: 38 },
      { name: "Shure SM7B", category: "Audio", cost: 32000, selling: 42000, stock: 18 },
      { name: "Marshall Major IV", category: "Audio", cost: 14000, selling: 18000, stock: 42 },
      { name: "Jabra GN93", category: "Audio", cost: 8000, selling: 11000, stock: 55 },
      { name: "Anker Soundcore Q45", category: "Audio", cost: 10000, selling: 13000, stock: 50 },
      { name: "Bang Olufsen H95", category: "Audio", cost: 38000, selling: 52000, stock: 12 },
      
      // Televisions (10)
      { name: "Samsung 65 4K QLED", category: "TVs", cost: 65000, selling: 85000, stock: 6 },
      { name: "LG OLED 55 C3", category: "TVs", cost: 75000, selling: 98000, stock: 4 },
      { name: "Sony Bravia 75 XR", category: "TVs", cost: 95000, selling: 125000, stock: 3 },
      { name: "TCL 43 Smart TV", category: "TVs", cost: 35000, selling: 45000, stock: 10 },
      { name: "Mi 50 4K TV", category: "TVs", cost: 40000, selling: 52000, stock: 12 },
      { name: "OnePlus TV 65", category: "TVs", cost: 55000, selling: 72000, stock: 8 },
      { name: "Hisense 55 4K", category: "TVs", cost: 45000, selling: 58000, stock: 9 },
      { name: "Panasonic 43 Full HD", category: "TVs", cost: 28000, selling: 36000, stock: 14 },
      { name: "LG 32 LED TV", category: "TVs", cost: 22000, selling: 28000, stock: 20 },
      { name: "Samsung 43 UHD", category: "TVs", cost: 38000, selling: 50000, stock: 11 },
      
      // Cameras (8)
      { name: "Canon EOS R6", category: "Cameras", cost: 150000, selling: 190000, stock: 5 },
      { name: "Sony A7R V", category: "Cameras", cost: 160000, selling: 205000, stock: 4 },
      { name: "Nikon Z8", category: "Cameras", cost: 155000, selling: 200000, stock: 4 },
      { name: "Fujifilm X-T5", category: "Cameras", cost: 120000, selling: 155000, stock: 6 },
      { name: "Canon 5D Mark IV", category: "Cameras", cost: 95000, selling: 125000, stock: 8 },
      { name: "GoPro HERO12", category: "Cameras", cost: 35000, selling: 48000, stock: 20 },
      { name: "DJI Osmo Action 4", category: "Cameras", cost: 25000, selling: 33000, stock: 25 },
      { name: "Panasonic S5II", category: "Cameras", cost: 135000, selling: 175000, stock: 5 },
      
      // Tablets (8)
      { name: "Apple iPad Pro 12.9", category: "Tablets", cost: 75000, selling: 98000, stock: 10 },
      { name: "Samsung Galaxy Tab S9", category: "Tablets", cost: 50000, selling: 65000, stock: 16 },
      { name: "Microsoft Surface Pro 9", category: "Tablets", cost: 60000, selling: 78000, stock: 12 },
      { name: "iPad Air 6", category: "Tablets", cost: 55000, selling: 70000, stock: 14 },
      { name: "Tab S9 Ultra", category: "Tablets", cost: 68000, selling: 88000, stock: 8 },
      { name: "OnePlus Pad", category: "Tablets", cost: 32000, selling: 42000, stock: 22 },
      { name: "Lenovo Tab P12", category: "Tablets", cost: 28000, selling: 36000, stock: 26 },
      { name: "Amazon Fire Max 11", category: "Tablets", cost: 18000, selling: 23000, stock: 35 },
      
      // Accessories (18)
      { name: "Mechanical RGB Keyboard", category: "Accessories", cost: 5000, selling: 7500, stock: 50 },
      { name: "Wireless Mouse Logitech", category: "Accessories", cost: 2500, selling: 3500, stock: 80 },
      { name: "USB-C Hub 7 Port", category: "Accessories", cost: 3000, selling: 4500, stock: 60 },
      { name: "Phone Stand Metal", category: "Accessories", cost: 800, selling: 1200, stock: 120 },
      { name: "Laptop Stand Aluminum", category: "Accessories", cost: 2000, selling: 3000, stock: 70 },
      { name: "Screen Protector Pack", category: "Accessories", cost: 500, selling: 750, stock: 200 },
      { name: "Wireless Charger", category: "Accessories", cost: 1500, selling: 2200, stock: 90 },
      { name: "Phone Case Silicone", category: "Accessories", cost: 300, selling: 450, stock: 250 },
      { name: "HDMI Cable 2.1", category: "Accessories", cost: 800, selling: 1200, stock: 100 },
      { name: "Lightning Cable", category: "Accessories", cost: 600, selling: 900, stock: 150 },
      { name: "Type-C Cable Fast", category: "Accessories", cost: 400, selling: 600, stock: 180 },
      { name: "Power Bank 20000mAh", category: "Accessories", cost: 1200, selling: 1800, stock: 95 },
      { name: "Desk Lamp LED", category: "Accessories", cost: 2500, selling: 3800, stock: 45 },
      { name: "Webcam 1080P HD", category: "Accessories", cost: 3500, selling: 5000, stock: 40 },
      { name: "Portable Speaker", category: "Accessories", cost: 2000, selling: 2800, stock: 65 },
      { name: "VGA Adapter", category: "Accessories", cost: 600, selling: 850, stock: 140 },
      { name: "Monitor Stand Adjustable", category: "Accessories", cost: 3000, selling: 4200, stock: 50 },
      { name: "Cable Organizer Kit", category: "Accessories", cost: 800, selling: 1100, stock: 160 },
      
      // Drones & Wearables (8)
      { name: "DJI Mavic 3", category: "Drones", cost: 85000, selling: 110000, stock: 8 },
      { name: "Apple Watch Series 9", category: "Wearables", cost: 35000, selling: 48000, stock: 22 },
      { name: "Samsung Galaxy Watch 6", category: "Wearables", cost: 28000, selling: 38000, stock: 26 },
      { name: "Fitbit Charge 6", category: "Wearables", cost: 12000, selling: 16000, stock: 40 },
      { name: "Garmin Fenix 7X", category: "Wearables", cost: 45000, selling: 60000, stock: 12 },
      { name: "DJI Mini 3 Pro", category: "Drones", cost: 35000, selling: 48000, stock: 15 },
      { name: "Sony LinkBuds", category: "Wearables", cost: 18000, selling: 25000, stock: 35 },
      { name: "Mi Band 8", category: "Wearables", cost: 3500, selling: 5000, stock: 100 },
    ];

    console.log(`📝 Starting to update with ${realProducts.length} products with real names...\n`);

    // Delete existing products
    await Product.deleteMany({});
    console.log('🗑️  Cleared existing products\n');

    // Create new products with real names
    const createdProducts = [];
    for (let i = 0; i < realProducts.length; i++) {
      const productData = realProducts[i];
      const randomSupplier = suppliers[Math.floor(Math.random() * suppliers.length)];

      const product = new Product({
        name: productData.name,
        category: productData.category,
        cost_price: productData.cost,
        selling_price: productData.selling,
        current_stock: productData.stock,
        reorder_point: Math.max(2, Math.ceil(productData.stock / 2)),
        reorder_quantity: Math.ceil(productData.stock) * 2,
        safety_stock: Math.ceil(productData.stock / 3),
        lead_time_days: 5,
        preferred_supplier_id: randomSupplier._id,
        low_stock_threshold: Math.ceil(productData.stock / 2),
        description: `Quality ${productData.category} product - ${productData.name}`,
        sku: `SKU-${String(i + 1).padStart(4, '0')}`
      });

      await product.save();
      createdProducts.push(product);
      console.log(`✅ ${i + 1}. ${product.name}`);
    }

    console.log(`\n✨ Successfully created ${createdProducts.length} products with real names!\n`);
    
    // Category summary
    const categories = {};
    createdProducts.forEach(p => {
      categories[p.category] = (categories[p.category] || 0) + 1;
    });
    
    console.log('📊 Products by Category:');
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`   ${cat}: ${count} products`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateProductsWithRealNames();
