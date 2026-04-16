const mongoose = require("mongoose")
require("dotenv").config()

// Import Supplier model
const Supplier = require("../models/supplier")

// Sample supplier data
const sampleSuppliers = [
  {
    name: "TechElectronics Wholesale",
    phone: "9876543210",
    email: "sales@techelectronics.com",
    categories: ["Electronics", "Computers"],
    address: "Block A, Industrial Park, Unit 102",
    city: "Bangalore",
    state: "Karnataka",
    bank_details: {
      account_holder: "TechElectronics Ltd",
      account_number: "9876543210123456",
      ifsc_code: "ICIC0000001",
      bank_name: "ICICI Bank"
    },
    upi_id: "techelectronics@upi",
    notes: "Preferred supplier for laptops and desktops",
    is_active: true
  },
  {
    name: "Fresh Foods & Groceries",
    phone: "8765432109",
    email: "contact@freshfoods.com",
    categories: ["Groceries", "Vegetables", "Fruits"],
    address: "Near Wholesale Market, Sector 5",
    city: "Delhi",
    state: "Delhi",
    bank_details: {
      account_holder: "Fresh Foods Pvt Ltd",
      account_number: "1234567890123456",
      ifsc_code: "HDFC0000101",
      bank_name: "HDFC Bank"
    },
    upi_id: "freshfoods@upi",
    notes: "Best for daily groceries and vegetables",
    is_active: true
  },
  {
    name: "Fashion & Apparel Trading",
    phone: "7654321098",
    email: "wholesale@fashionapparel.com",
    categories: ["Clothing", "Apparels", "Shoes"],
    address: "Fashion District, Building C",
    city: "Mumbai",
    state: "Maharashtra",
    bank_details: {
      account_holder: "Fashion Apparel Co",
      account_number: "5555666677778888",
      ifsc_code: "AXIS0000202",
      bank_name: "Axis Bank"
    },
    upi_id: "fashionapparel@upi",
    notes: "Wide variety of clothing and footwear",
    is_active: true
  },
  {
    name: "Bookeaven Publications",
    phone: "6543210987",
    email: "bulk@bookeaven.com",
    categories: ["Books", "Stationery", "Educational"],
    address: "Knowledge Hub, Sapphire Tower, 3rd Floor",
    city: "Chennai",
    state: "Tamil Nadu",
    bank_details: {
      account_holder: "Bookeaven Ltd",
      account_number: "9999888877776666",
      ifsc_code: "SBIN0000303",
      bank_name: "State Bank of India"
    },
    upi_id: "bookeaven@upi",
    notes: "Educational and reference books supplier",
    is_active: true
  },
  {
    name: "Premium Furniture Solutions",
    phone: "5432109876",
    email: "order@premiumfurniture.com",
    categories: ["Furniture", "Home Decor", "Office Supplies"],
    address: "Furniture Hub, Plot 45, Industrial Zone",
    city: "Pune",
    state: "Maharashtra",
    bank_details: {
      account_holder: "Premium Furniture Pvt Ltd",
      account_number: "4444333322221111",
      ifsc_code: "KOTAK0000404",
      bank_name: "Kotak Mahindra Bank"
    },
    upi_id: "premiumfurniture@upi",
    notes: "High-quality furniture for offices and homes",
    is_active: true
  },
  {
    name: "Organic Wellness Center",
    phone: "4321098765",
    email: "wholesale@organicwellness.com",
    categories: ["Health", "Wellness", "Organic Products"],
    address: "Wellness Park, Green Building",
    city: "Hyderabad",
    state: "Telangana",
    bank_details: {
      account_holder: "Organic Wellness Ltd",
      account_number: "7777888899990000",
      ifsc_code: "YESB0000505",
      bank_name: "Yes Bank"
    },
    upi_id: "organicwellness@upi",
    notes: "Certified organic and wellness products",
    is_active: true
  },
  {
    name: "Industrial Hardware Co",
    phone: "3210987654",
    email: "sales@industrialhardware.com",
    categories: ["Hardware", "Tools", "Industrial Supplies"],
    address: "Industrial Complex, Warehouse 7",
    city: "Ahmedabad",
    state: "Gujarat",
    bank_details: {
      account_holder: "Industrial Hardware Co",
      account_number: "1111222233334444",
      ifsc_code: "IDFB0000606",
      bank_name: "IDFC Bank"
    },
    upi_id: "industrialhardware@upi",
    notes: "Complete range of industrial hardware",
    is_active: true
  },
  {
    name: "Global Imports Trading",
    phone: "2109876543",
    email: "imports@globaltrading.com",
    categories: ["Imports", "Electronics", "Cosmetics"],
    address: "Port Zone, Import Hub, Block 2",
    city: "Kolkata",
    state: "West Bengal",
    bank_details: {
      account_holder: "Global Imports Ltd",
      account_number: "5555444433332222",
      ifsc_code: "BKID0000707",
      bank_name: "Bank of India"
    },
    upi_id: "globalimports@upi",
    notes: "International products and imports",
    is_active: true
  },
  {
    name: "Swift Logistics & Supply",
    phone: "1098765432",
    email: "contact@swiftlogistics.com",
    categories: ["Groceries", "Electronics", "General Supplies"],
    address: "Logistics Hub, Distribution Center",
    city: "Jaipur",
    state: "Rajasthan",
    bank_details: {
      account_holder: "Swift Logistics Ltd",
      account_number: "9876543216543210",
      ifsc_code: "CITI0000808",
      bank_name: "Citibank"
    },
    upi_id: "swiftlogistics@upi",
    notes: "Fast and reliable supplier",
    is_active: true
  },
  {
    name: "Artisan Crafts & Gifts",
    phone: "9123456789",
    email: "artisan@craftsgifts.com",
    categories: ["Gifts", "Home Decor", "Handicrafts"],
    address: "Artisan Market, Craft Lane",
    city: "Lucknow",
    state: "Uttar Pradesh",
    bank_details: {
      account_holder: "Artisan Crafts Ltd",
      account_number: "3333444455556666",
      ifsc_code: "HDFC0000909",
      bank_name: "HDFC Bank"
    },
    upi_id: "artisancrafts@upi",
    notes: "Unique handcrafted items and gifts",
    is_active: true
  }
]

// Function to seed data
async function seedSuppliers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI)
    console.log("🔗 MongoDB Connected")

    // Check if suppliers already exist
    const existingCount = await Supplier.countDocuments()
    if (existingCount > 0) {
      console.log(`✅ Database already has ${existingCount} suppliers`)
      const proceed = process.argv[2] === "--force"
      if (!proceed) {
        console.log(
          "ℹ️  Use 'npm run seed:suppliers -- --force' to clear and reseed"
        )
        process.exit(0)
      }
      console.log("🗑️  Clearing existing suppliers...")
      await Supplier.deleteMany({})
      console.log("✅ Suppliers cleared")
    }

    // Insert sample data
    console.log("📝 Inserting sample suppliers...")
    const result = await Supplier.insertMany(sampleSuppliers)
    console.log(`✅ Successfully created ${result.length} suppliers`)

    // Display summary
    console.log("\n📊 Suppliers Created:")
    console.log("─".repeat(60))
    result.forEach((supplier, index) => {
      console.log(`${index + 1}. ${supplier.name}`)
      console.log(`   📧 ${supplier.email}`)
      console.log(`   📱 ${supplier.phone}`)
      console.log(`   🏷️  Categories: ${supplier.categories.join(", ")}`)
      console.log(`   📍 ${supplier.city}, ${supplier.state}`)
      console.log("")
    })

    console.log("─".repeat(60))
    console.log("✨ Data seeding completed successfully!")
    console.log("\n💡 Next Steps:")
    console.log("   1. Go to Suppliers page in your app")
    console.log("   2. You should see all 10 suppliers listed")
    console.log("   3. Link suppliers to your products")
    console.log("   4. Set low stock thresholds and reorder quantities")

    process.exit(0)
  } catch (error) {
    console.error("❌ Error seeding suppliers:", error.message)
    process.exit(1)
  }
}

// Run seeding
seedSuppliers()
