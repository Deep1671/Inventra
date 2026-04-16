require('dotenv').config()
const mongoose = require('mongoose')
const Sale = require('../models/sale')

async function cleanInvalidSales() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ Connected to MongoDB')

    // Find sales without product_name or createdAt
    const invalidSales = await Sale.find({
      $or: [
        { product_name: { $exists: false } },
        { product_name: null },
        { product_name: '' },
        { createdAt: { $exists: false } },
        { createdAt: null }
      ]
    })

    console.log(`\n📊 Found ${invalidSales.length} invalid sales records`)

    if (invalidSales.length > 0) {
      console.log('\n🗑️  Deleting invalid sales...')

      const result = await Sale.deleteMany({
        $or: [
          { product_name: { $exists: false } },
          { product_name: null },
          { product_name: '' },
          { createdAt: { $exists: false } },
          { createdAt: null }
        ]
      })

      console.log(`✅ Deleted ${result.deletedCount} invalid sales records`)
    } else {
      console.log('\n✅ No invalid sales found. Database is clean!')
    }

    // Show remaining sales count
    const totalSales = await Sale.countDocuments()
    console.log(`\n📈 Total valid sales remaining: ${totalSales}`)

    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
    process.exit(0)

  } catch (error) {
    console.error('❌ Error cleaning sales:', error)
    process.exit(1)
  }
}

cleanInvalidSales()
