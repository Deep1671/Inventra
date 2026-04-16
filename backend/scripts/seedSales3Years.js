require('dotenv').config()
const mongoose = require('mongoose')
const Sale = require('../models/sale')
const SalesOrder = require('../models/salesOrder')
const Product = require('../models/product')

async function seedSales3Years() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ Connected to MongoDB')

    // Get all products
    const products = await Product.find().select('_id name selling_price cost_price')

    if (products.length === 0) {
      console.log('❌ No products found! Please add products first.')
      await mongoose.disconnect()
      process.exit(1)
    }

    console.log(`\n📦 Found ${products.length} products`)

    // Generate sample sales data for last 3 years
    const salesData = []
    const salesOrdersData = []
    const daysBack = 365 * 3 // 3 years

    console.log('\n📊 Creating sample sales data for last 3 years...')

    // Generate sales for each day in the past 3 years
    for (let dayIndex = 0; dayIndex < daysBack; dayIndex++) {
      const date = new Date()
      date.setDate(date.getDate() - dayIndex)
      date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0)

      // Randomly decide if there should be sales on this day (80% of days have sales)
      if (Math.random() > 0.2) {
        // Generate 1-5 sales per day
        const numSalesThisDay = Math.floor(Math.random() * 5) + 1

        for (let saleIndex = 0; saleIndex < numSalesThisDay; saleIndex++) {
          // Random product
          const randomProduct = products[Math.floor(Math.random() * products.length)]

          // Random quantity between 1 and 20
          const quantity = Math.floor(Math.random() * 20) + 1

          // Calculate revenue
          const revenue = randomProduct.selling_price * quantity

          // 70% chance of Sale, 30% chance of SalesOrder
          if (Math.random() > 0.3) {
            // Add to legacy Sale collection
            salesData.push({
              product_id: randomProduct._id,
              product_name: randomProduct.name,
              quantity_sold: quantity,
              revenue: revenue,
              createdAt: new Date(date)
            })
          } else {
            // Add to SalesOrder collection
            salesOrdersData.push({
              status: 'COMPLETED',
              items: [
                {
                  product_id: randomProduct._id,
                  product_name: randomProduct.name,
                  quantity: quantity,
                  unit_price: randomProduct.selling_price,
                  subtotal: revenue
                }
              ],
              customer_name: `Customer ${Math.floor(Math.random() * 1000)}`,
              customer_phone: `+91${Math.floor(Math.random() * 9000000000) + 1000000000}`,
              customer_email: `customer${Math.floor(Math.random() * 10000)}@example.com`,
              total_amount: revenue,
              completed_date: new Date(date),
              createdAt: new Date(date)
            })
          }
        }
      }

      if ((daysBack - dayIndex) % 100 === 0) {
        console.log(`   📅 Processing day ${daysBack - dayIndex} days ago...`)
      }
    }

    console.log(`\n📊 Total records to insert:`)
    console.log(`   • Legacy Sales: ${salesData.length}`)
    console.log(`   • SalesOrders: ${salesOrdersData.length}`)

    // Insert legacy sales data in batches
    console.log('\n📊 Inserting legacy Sales records...')
    let successCount = 0
    const batchSize = 100

    for (let i = 0; i < salesData.length; i += batchSize) {
      try {
        const batch = salesData.slice(i, i + batchSize)
        await Sale.insertMany(batch, { ordered: false })
        successCount += batch.length
        console.log(`   ✅ Created ${successCount}/${salesData.length} legacy sales`)
      } catch (err) {
        console.log(`   ⚠️  ${err.writeErrors?.length || 0} errors in batch, continuing...`)
        successCount += batchSize - (err.writeErrors?.length || 0)
      }
    }

    // Insert SalesOrders in batches
    console.log('\n📊 Inserting SalesOrder records...')
    let orderSuccessCount = 0

    for (let i = 0; i < salesOrdersData.length; i += batchSize) {
      try {
        const batch = salesOrdersData.slice(i, i + batchSize)
        await SalesOrder.insertMany(batch, { ordered: false })
        orderSuccessCount += batch.length
        console.log(`   ✅ Created ${orderSuccessCount}/${salesOrdersData.length} sales orders`)
      } catch (err) {
        console.log(`   ⚠️  ${err.writeErrors?.length || 0} errors in batch, continuing...`)
        orderSuccessCount += batchSize - (err.writeErrors?.length || 0)
      }
    }

    // Show summary
    const allSales = await Sale.find()
    const allOrders = await SalesOrder.find()
    
    const totalSalesRevenue = allSales.reduce((sum, sale) => sum + (sale.revenue || 0), 0)
    const totalOrderRevenue = allOrders.reduce((sum, order) => {
      return sum + (order.total_amount || 0)
    }, 0)
    
    const totalQuantitySales = allSales.reduce((sum, sale) => sum + (sale.quantity_sold || 0), 0)
    const totalQuantityOrders = allOrders.reduce((sum, order) => {
      return sum + (order.items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0)
    }, 0)

    console.log('\n📈 Complete Sales Summary:')
    console.log(`\n   Legacy Sales Collection:`)
    console.log(`      • Total Records: ${allSales.length}`)
    console.log(`      • Total Quantity: ${totalQuantitySales} units`)
    console.log(`      • Total Revenue: ₹${totalSalesRevenue.toFixed(2)}`)
    
    console.log(`\n   SalesOrder Collection:`)
    console.log(`      • Total Records: ${allOrders.length}`)
    console.log(`      • Total Quantity: ${totalQuantityOrders} units`)
    console.log(`      • Total Revenue: ₹${totalOrderRevenue.toFixed(2)}`)
    
    console.log(`\n   Combined:`)
    console.log(`      • Total Sales: ${allSales.length + allOrders.length}`)
    console.log(`      • Total Quantity: ${totalQuantitySales + totalQuantityOrders} units`)
    console.log(`      • Total Revenue: ₹${(totalSalesRevenue + totalOrderRevenue).toFixed(2)}`)

    // Show recent 5 sales
    const recentSales = await Sale.find().sort({ createdAt: -1 }).limit(5)
    console.log('\n🔥 Recent 5 Legacy Sales:')
    recentSales.forEach((sale, index) => {
      console.log(`   ${index + 1}. ${sale.product_name} - Qty: ${sale.quantity_sold} - Revenue: ₹${sale.revenue} - Date: ${sale.createdAt.toLocaleDateString()}`)
    })

    // Show recent 5 orders
    const recentOrders = await SalesOrder.find().sort({ createdAt: -1 }).limit(5)
    console.log('\n🔥 Recent 5 SalesOrders:')
    recentOrders.forEach((order, index) => {
      const itemsStr = order.items.map(i => `${i.product_name} (${i.quantity})`).join(', ')
      console.log(`   ${index + 1}. ${itemsStr} - Total: ₹${order.total_amount} - Date: ${order.createdAt.toLocaleDateString()}`)
    })

    await mongoose.disconnect()
    console.log('\n✅ Disconnected from MongoDB')
    console.log('\n🎉 3-year sales data seeding completed successfully!')
    process.exit(0)

  } catch (error) {
    console.error('❌ Error seeding sales:', error)
    process.exit(1)
  }
}

seedSales3Years()
