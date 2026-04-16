require('dotenv').config()
const mongoose = require('mongoose')
const Sale = require('../models/sale')
const Product = require('../models/product')

async function seedSales() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ Connected to MongoDB')

    // Get all products
    const products = await Product.find().select('_id name selling_price')

    if (products.length === 0) {
      console.log('❌ No products found! Please add products first.')
      await mongoose.disconnect()
      process.exit(1)
    }

    console.log(`\n📦 Found ${products.length} products`)

    // Generate sample sales data
    const salesData = []
    const daysBack = 30 // Generate sales for last 30 days

    console.log('\n📊 Creating sample sales data...')

    for (let i = 0; i < 50; i++) {
      // Random product
      const randomProduct = products[Math.floor(Math.random() * products.length)]

      // Random quantity between 1 and 10
      const quantity = Math.floor(Math.random() * 10) + 1

      // Calculate revenue
      const revenue = randomProduct.selling_price * quantity

      salesData.push({
        product_id: randomProduct._id,
        product_name: randomProduct.name,
        quantity_sold: quantity,
        revenue: revenue
      })
    }

    // Insert sales data one by one to avoid bulk errors
    console.log('\n📊 Inserting sales records...')
    let successCount = 0

    for (const saleData of salesData) {
      try {
        await Sale.create(saleData)
        successCount++
        if (successCount % 10 === 0) {
          console.log(`   ✅ Created ${successCount}/${salesData.length} sales`)
        }
      } catch (err) {
        console.log(`   ❌ Failed to create sale:`, err.message)
      }
    }

    console.log(`\n✅ Successfully created ${successCount} sales records!`)

    // Show summary
    const allSales = await Sale.find()
    const totalRevenue = allSales.reduce((sum, sale) => sum + sale.revenue, 0)
    const totalQuantity = allSales.reduce((sum, sale) => sum + sale.quantity_sold, 0)

    console.log('\n📈 Sales Summary:')
    console.log(`   Total Sales: ${allSales.length}`)
    console.log(`   Total Quantity Sold: ${totalQuantity} units`)
    console.log(`   Total Revenue: ₹${totalRevenue.toFixed(2)}`)

    // Show recent 5 sales
    const recentSales = await Sale.find().sort({ createdAt: -1 }).limit(5)
    console.log('\n🔥 Recent 5 Sales:')
    recentSales.forEach((sale, index) => {
      console.log(`   ${index + 1}. ${sale.product_name} - Qty: ${sale.quantity_sold} - Revenue: ₹${sale.revenue} - Date: ${sale.createdAt.toLocaleDateString()}`)
    })

    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
    console.log('\n🎉 Sales data seeding completed successfully!')
    process.exit(0)

  } catch (error) {
    console.error('❌ Error seeding sales:', error)
    process.exit(1)
  }
}

seedSales()
