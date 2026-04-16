require('dotenv').config()
const mongoose = require('mongoose')
const Product = require('../models/product')
const Sale = require('../models/sale')

async function verifyDataFix() {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ Connected to MongoDB\n')

    console.log('🔍 VERIFYING DATA FIXES...\n')

    // Check top 5 products
    const topProducts = await Product.find().limit(5)
    
    console.log('📦 TOP PRODUCTS (Verification):')
    console.log('─'.repeat(80))
    
    for (let product of topProducts) {
      const sales = await Sale.find({ product_id: product._id }).limit(10)
      
      if (sales.length > 0) {
        const totalRevenue = sales.reduce((sum, s) => sum + (s.revenue || 0), 0)
        const totalQuantity = sales.reduce((sum, s) => sum + (s.quantity_sold || 0), 0)
        const totalCost = totalQuantity * (product.cost_price || 0)
        const profit = totalRevenue - totalCost
        const margin = totalRevenue > 0 ? ((profit / totalRevenue) * 100) : 0

        console.log(`\n✅ ${product.name}`)
        console.log(`   Cost Price:    ₹${product.cost_price}`)
        console.log(`   Selling Price: ₹${product.selling_price}`)
        console.log(`   Qty Sold:      ${totalQuantity} units`)
        console.log(`   Revenue:       ₹${totalRevenue.toFixed(2)}`)
        console.log(`   Cost:          ₹${totalCost.toFixed(2)}`)
        console.log(`   Profit:        ₹${profit.toFixed(2)}`)
        console.log(`   Margin:        ${margin.toFixed(2)}%`)
        
        if (margin < 0) {
          console.log(`   ⚠️  WARNING: Negative margin!`)
        } else if (margin > 0) {
          console.log(`   ✅ GOOD: Positive margin!`)
        }
      }
    }

    console.log('\n' + '─'.repeat(80))
    console.log('\n✅ DATA VERIFICATION COMPLETE!\n')

    await mongoose.disconnect()
    process.exit(0)

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

verifyDataFix()
