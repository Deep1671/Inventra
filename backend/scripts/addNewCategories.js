const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../models/product');
const Supplier = require('../models/supplier');

async function addProductsWithNewCategories() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 MongoDB Connected\n');

    // Get suppliers
    const suppliers = await Supplier.find({}).lean();
    if (suppliers.length === 0) {
      console.log('❌ No suppliers found!');
      process.exit(1);
    }

    // Get current product count
    const currentCount = await Product.countDocuments();
    console.log(`📊 Current products: ${currentCount}\n`);

    // New categories with diverse products
    const newProducts = [
      // Printers & Scanning (8)
      { name: "HP LaserJet Pro M404n", category: "Printers", cost: 28000, selling: 38000, stock: 12 },
      { name: "Epson WorkForce M15180", category: "Printers", cost: 32000, selling: 42000, stock: 10 },
      { name: "Canon ImageRunner 2425i", category: "Printers", cost: 45000, selling: 60000, stock: 8 },
      { name: "Xerox VersaLink C7025", category: "Printers", cost: 52000, selling: 68000, stock: 6 },
      { name: "Brother HL-L8360CDW", category: "Printers", cost: 22000, selling: 30000, stock: 15 },
      { name: "Ricoh Aficio MP 2852", category: "Printers", cost: 48000, selling: 65000, stock: 7 },
      { name: "Kyocera Ecosys M8130CIDN", category: "Printers", cost: 55000, selling: 72000, stock: 5 },
      { name: "Fujitsu ScanSnap iX1600", category: "Scanners", cost: 35000, selling: 48000, stock: 14 },

      // Storage Devices (10)
      { name: "Samsung 870 EVO 2.5 1TB", category: "Storage", cost: 8500, selling: 11500, stock: 45 },
      { name: "WD Blue 3D NAND 1TB", category: "Storage", cost: 8000, selling: 11000, stock: 50 },
      { name: "Crucial P5 Plus 1TB NVMe", category: "Storage", cost: 12000, selling: 16000, stock: 40 },
      { name: "Samsung 990 Pro 2TB", category: "Storage", cost: 22000, selling: 29000, stock: 25 },
      { name: "Seagate Barracuda 2TB HDD", category: "Storage", cost: 5500, selling: 7500, stock: 60 },
      { name: "Sandisk Extreme Portable 1TB", category: "Storage", cost: 10000, selling: 13500, stock: 38 },
      { name: "LaCie 5TB Mobile Drive", category: "Storage", cost: 15000, selling: 20000, stock: 20 },
      { name: "Transcend StoreJet 2.5 1TB", category: "Storage", cost: 7000, selling: 9500, stock: 55 },
      { name: "Kingston A3000 500GB", category: "Storage", cost: 5500, selling: 7500, stock: 65 },
      { name: "Sabrent Rocket XM.2 4TB", category: "Storage", cost: 32000, selling: 42000, stock: 18 },

      // Networking Equipment (8)
      { name: "TP-Link Archer AX12", category: "Networking", cost: 8500, selling: 11500, stock: 35 },
      { name: "ASUS ROG Rapture GT-AX12000", category: "Networking", cost: 32000, selling: 42000, stock: 10 },
      { name: "Netgear Nighthawk AX12", category: "Networking", cost: 28000, selling: 38000, stock: 12 },
      { name: "MikroTik hAP ac2", category: "Networking", cost: 12000, selling: 16000, stock: 25 },
      { name: "Ubiquiti UniFi Dream Machine", category: "Networking", cost: 45000, selling: 60000, stock: 8 },
      { name: "Cisco Catalyst 3850", category: "Networking", cost: 85000, selling: 115000, stock: 5 },
      { name: "Linksys Velop MX10600", category: "Networking", cost: 35000, selling: 48000, stock: 12 },
      { name: "D-Link DIR-X6060", category: "Networking", cost: 18000, selling: 25000, stock: 20 },

      // Gaming Consoles (6)
      { name: "PlayStation 5", category: "Gaming", cost: 45000, selling: 62000, stock: 8 },
      { name: "Xbox Series X", category: "Gaming", cost: 48000, selling: 65000, stock: 7 },
      { name: "Nintendo Switch OLED", category: "Gaming", cost: 32000, selling: 42000, stock: 15 },
      { name: "Meta Quest 3 256GB", category: "Gaming", cost: 32000, selling: 42000, stock: 12 },
      { name: "Steam Deck 512GB", category: "Gaming", cost: 38000, selling: 50000, stock: 10 },
      { name: "Xbox Series S", category: "Gaming", cost: 28000, selling: 38000, stock: 14 },

      // Smart Home Devices (8)
      { name: "Amazon Echo Dot 5", category: "Smart Home", cost: 3500, selling: 5000, stock: 80 },
      { name: "Google Nest Hub Max", category: "Smart Home", cost: 12000, selling: 16000, stock: 25 },
      { name: "Apple HomePod mini", category: "Smart Home", cost: 8500, selling: 12000, stock: 32 },
      { name: "Philips Hue Lightstrip Plus", category: "Smart Home", cost: 8000, selling: 11000, stock: 40 },
      { name: "LIFX Color A19 Bulb", category: "Smart Home", cost: 3500, selling: 5000, stock: 95 },
      { name: "TP-Link Kasa Smart Plug", category: "Smart Home", cost: 1500, selling: 2200, stock: 150 },
      { name: "August Smart Lock Pro", category: "Smart Home", cost: 22000, selling: 30000, stock: 18 },
      { name: "Ring Video Doorbell Pro", category: "Smart Home", cost: 18000, selling: 25000, stock: 22 },

      // Power Supply Units (6)
      { name: "Corsair RM850x Gold", category: "Power Supplies", cost: 12000, selling: 16000, stock: 28 },
      { name: "EVGA SuperNOVA 750 G5", category: "Power Supplies", cost: 10000, selling: 13500, stock: 35 },
      { name: "Seasonic Prime 1000W", category: "Power Supplies", cost: 18000, selling: 24000, stock: 18 },
      { name: "Thermaltake Smart 500W", category: "Power Supplies", cost: 4500, selling: 6000, stock: 60 },
      { name: "MSI MPG A850GF", category: "Power Supplies", cost: 14000, selling: 19000, stock: 22 },
      { name: "Gigabyte P850GM", category: "Power Supplies", cost: 15000, selling: 20000, stock: 20 },

      // Cooling Systems (6)
      { name: "Noctua NH-D15", category: "Cooling", cost: 8500, selling: 12000, stock: 32 },
      { name: "Be Quiet Dark Rock Pro 4", category: "Cooling", cost: 9000, selling: 12500, stock: 28 },
      { name: "Corsair H150i Elite Capellix", category: "Cooling", cost: 22000, selling: 30000, stock: 15 },
      { name: "NZXT Kraken Z73", category: "Cooling", cost: 28000, selling: 38000, stock: 12 },
      { name: "Arctic Liquid Freezer II 360", category: "Cooling", cost: 18000, selling: 25000, stock: 18 },
      { name: "Thermalright Phantom Spirit 140", category: "Cooling", cost: 7500, selling: 10500, stock: 38 },

      // Projectors (6)
      { name: "Epson EB-2250U", category: "Projectors", cost: 65000, selling: 85000, stock: 6 },
      { name: "BenQ LU9715", category: "Projectors", cost: 75000, selling: 98000, stock: 5 },
      { name: "Optoma EH412", category: "Projectors", cost: 48000, selling: 65000, stock: 9 },
      { name: "Sony VPL-FHZ75", category: "Projectors", cost: 95000, selling: 125000, stock: 4 },
      { name: "Panasonic PT-RZ870", category: "Projectors", cost: 55000, selling: 72000, stock: 8 },
      { name: "Christie DHD800-GS", category: "Projectors", cost: 85000, selling: 115000, stock: 5 },

      // Professional Lighting (7)
      { name: "Neewer RGB LED Panel 480P", category: "Lighting", cost: 8500, selling: 12000, stock: 25 },
      { name: "Aputure MC 4-light Kit", category: "Lighting", cost: 42000, selling: 58000, stock: 8 },
      { name: "Godox SL-60W", category: "Lighting", cost: 28000, selling: 38000, stock: 14 },
      { name: "Elgato Key Light Air", category: "Lighting", cost: 12000, selling: 16000, stock: 30 },
      { name: "Nanlite PavoTube II 30X", category: "Lighting", cost: 22000, selling: 30000, stock: 16 },
      { name: "Manfrotto Spectra 900F", category: "Lighting", cost: 35000, selling: 48000, stock: 10 },
      { name: "Broncolor Siros 400L", category: "Lighting", cost: 45000, selling: 60000, stock: 9 },
    ];

    console.log(`📝 Adding ${newProducts.length} products with new categories...\n`);

    for (let i = 0; i < newProducts.length; i++) {
      const productData = newProducts[i];
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
        description: `Professional ${productData.category} product - ${productData.name}`,
        sku: `SKU-${String(currentCount + i + 1).padStart(4, '0')}`
      });

      await product.save();
      console.log(`✅ ${currentCount + i + 1}. ${product.name} (${product.category})`);
    }

    // Get total count and show summary
    const totalCount = await Product.countDocuments();
    
    // Get category breakdown
    const categories = await Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log(`\n✨ Successfully added ${newProducts.length} products!`);
    console.log(`📊 Total products in database: ${totalCount}\n`);
    console.log('📋 Product Categories Breakdown:');
    categories.forEach(cat => {
      console.log(`   ${cat._id}: ${cat.count} products`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addProductsWithNewCategories();
