const mongoose = require("mongoose")
require("dotenv").config()

// Import models
const Product = require("../models/product")
const Supplier = require("../models/supplier")

// Function to seed products with suppliers
async function seedProductsWithSuppliers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI)
    console.log("🔗 MongoDB Connected")

    // Get all suppliers
    const suppliers = await Supplier.find()
    if (suppliers.length === 0) {
      console.log("❌ No suppliers found! Please run seed:suppliers first")
      console.log("   npm run seed:suppliers")
      process.exit(1)
    }

    console.log(`✅ Found ${suppliers.length} suppliers`)

    // Get existing products
    let products = await Product.find()
    console.log(`✅ Found ${products.length} existing products`)

    if (products.length === 0) {
      console.log("ℹ️  No products in database. Creating sample products...")
      
      // Create sample products
      const sampleProducts = [
        {
          name: "Dell Laptop XPS 13",
          category: "Electronics",
          cost_price: 45000,
          selling_price: 55000,
          current_stock: 8,
          safety_stock: 3,
          reorder_point: 5,
          lead_time_days: 5,
          preferred_supplier_id: suppliers.find(s => s.name === "TechElectronics Wholesale")?._id,
          low_stock_threshold: 5,
          reorder_quantity: 10
        },
        {
          name: "Apple MacBook Pro",
          category: "Electronics",
          cost_price: 95000,
          selling_price: 120000,
          current_stock: 1,
          safety_stock: 2,
          reorder_point: 5,
          lead_time_days: 7,
          preferred_supplier_id: suppliers.find(s => s.name === "TechElectronics Wholesale")?._id,
          low_stock_threshold: 5,
          reorder_quantity: 10
        },
        {
          name: "Organic Basmati Rice (10kg)",
          category: "Groceries",
          cost_price: 500,
          selling_price: 650,
          current_stock: 2,
          safety_stock: 10,
          reorder_point: 15,
          lead_time_days: 2,
          preferred_supplier_id: suppliers.find(s => s.name === "Fresh Foods & Groceries")?._id,
          low_stock_threshold: 15,
          reorder_quantity: 50
        },
        {
          name: "Fresh Tomatoes (per kg)",
          category: "Vegetables",
          cost_price: 20,
          selling_price: 30,
          current_stock: 12,
          safety_stock: 5,
          reorder_point: 8,
          lead_time_days: 1,
          preferred_supplier_id: suppliers.find(s => s.name === "Fresh Foods & Groceries")?._id,
          low_stock_threshold: 8,
          reorder_quantity: 30
        },
        {
          name: "Cotton T-Shirt Pack (5 pcs)",
          category: "Clothing",
          cost_price: 300,
          selling_price: 500,
          current_stock: 25,
          safety_stock: 5,
          reorder_point: 10,
          lead_time_days: 4,
          preferred_supplier_id: suppliers.find(s => s.name === "Fashion & Apparel Trading")?._id,
          low_stock_threshold: 10,
          reorder_quantity: 30
        },
        {
          name: "Denim Jeans",
          category: "Clothing",
          cost_price: 600,
          selling_price: 1000,
          current_stock: 2,
          safety_stock: 2,
          reorder_point: 10,
          lead_time_days: 5,
          preferred_supplier_id: suppliers.find(s => s.name === "Fashion & Apparel Trading")?._id,
          low_stock_threshold: 3,
          reorder_quantity: 15
        },
        {
          name: "Comprehensive English Grammar",
          category: "Books",
          cost_price: 150,
          selling_price: 250,
          current_stock: 30,
          safety_stock: 5,
          reorder_point: 10,
          lead_time_days: 3,
          preferred_supplier_id: suppliers.find(s => s.name === "Bookeaven Publications")?._id,
          low_stock_threshold: 10,
          reorder_quantity: 50
        },
        {
          name: "Office Chair (Executive)",
          category: "Furniture",
          cost_price: 5000,
          selling_price: 8000,
          current_stock: 6,
          safety_stock: 2,
          reorder_point: 3,
          lead_time_days: 7,
          preferred_supplier_id: suppliers.find(s => s.name === "Premium Furniture Solutions")?._id,
          low_stock_threshold: 3,
          reorder_quantity: 8
        },
        {
          name: "Standing Desk (90cm)",
          category: "Furniture",
          cost_price: 8000,
          selling_price: 12000,
          current_stock: 2,
          safety_stock: 1,
          reorder_point: 2,
          lead_time_days: 7,
          preferred_supplier_id: suppliers.find(s => s.name === "Premium Furniture Solutions")?._id,
          low_stock_threshold: 2,
          reorder_quantity: 5
        },
        {
          name: "Organic Green Tea (100 bags)",
          category: "Health",
          cost_price: 200,
          selling_price: 350,
          current_stock: 18,
          safety_stock: 5,
          reorder_point: 8,
          lead_time_days: 3,
          preferred_supplier_id: suppliers.find(s => s.name === "Organic Wellness Center")?._id,
          low_stock_threshold: 8,
          reorder_quantity: 30
        }
      ]

      const createdProducts = await Product.insertMany(sampleProducts)
      products = createdProducts
      console.log(`📦 Created ${createdProducts.length} sample products`)
    }

    // Update products with supplier information
    console.log("\n🔄 Linking suppliers to products...")
    let updatedCount = 0

    for (let product of products) {
      if (!product.preferred_supplier_id) {
        // Assign a random supplier based on category
        const matchingSupplier = suppliers.find(s =>
          s.categories.some(c => c.toLowerCase().includes(product.category.toLowerCase()))
        ) || suppliers[Math.floor(Math.random() * suppliers.length)]

        const updates = {
          preferred_supplier_id: matchingSupplier._id,
          low_stock_threshold: Math.max(product.reorder_point, 5),
          reorder_quantity: Math.max(Math.ceil(product.reorder_point * 2), 10)
        }

        await Product.findByIdAndUpdate(product._id, updates)
        updatedCount++
      }
    }

    console.log(`✅ Updated ${updatedCount} products with supplier links`)

    // Display summary
    console.log("\n📊 Products with Supplier Links:")
    console.log("─".repeat(80))

    const updatedProducts = await Product.find().populate("preferred_supplier_id")
    updatedProducts.slice(0, 10).forEach((product, index) => {
      const supplier = product.preferred_supplier_id?.name || "Not assigned"
      console.log(`${index + 1}. ${product.name}`)
      console.log(`   📦 Stock: ${product.current_stock} | Threshold: ${product.low_stock_threshold} | Reorder: ${product.reorder_quantity}`)
      console.log(`   🤝 Supplier: ${supplier}`)
      console.log(`   💰 Cost: ₹${product.cost_price} | Price: ₹${product.selling_price}`)
      console.log("")
    })

    console.log("─".repeat(80))
    console.log("✨ Product-Supplier linking completed successfully!")
    console.log("\n💡 Next Steps:")
    console.log("   1. Go to Products page in your app")
    console.log("   2. See products with low stock red indicators")
    console.log("   3. Click Edit on any product to see supplier details")
    console.log("   4. Create purchase orders for low stock items")

    process.exit(0)
  } catch (error) {
    console.error("❌ Error seeding products:", error.message)
    process.exit(1)
  }
}

// Run seeding
seedProductsWithSuppliers()
