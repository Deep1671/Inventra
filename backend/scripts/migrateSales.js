const mongoose = require("mongoose")
const Sale = require("../models/sale")
const SalesOrder = require("../models/salesOrder")
require("dotenv").config()

// Migration script to convert existing Sales to SalesOrders
const migrateSalesToSalesOrders = async () => {
  try {
    console.log("🔄 Starting sales migration to unified sales order format...")
    
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI)
    console.log("✅ Database connected")
    
    // Get all existing sales
    const existingSales = await Sale.find({}).populate('product_id')
    console.log(`📊 Found ${existingSales.length} existing sales records`)
    
    if (existingSales.length === 0) {
      console.log("✅ No existing sales to migrate")
      return
    }
    
    let migratedCount = 0
    let errorCount = 0
    
    for (const sale of existingSales) {
      try {
        // Check if this sale has already been migrated
        const existingOrder = await SalesOrder.findOne({
          migration_source_id: sale._id
        })
        
        if (existingOrder) {
          console.log(`⏭️  Sale ${sale._id} already migrated, skipping`)
          continue
        }
        
        // Create equivalent sales order
        const salesOrderData = {
          customer_info: {
            name: "Legacy Customer", // Default name for old sales
            email: "",
            phone: "",
            address: ""
          },
          items: [{
            product_id: sale.product_id._id,
            product_name: sale.product_name,
            quantity: sale.quantity_sold,
            unit_price: sale.revenue / sale.quantity_sold, // Calculate unit price
            subtotal: sale.revenue
          }],
          total_amount: sale.revenue,
          status: "COMPLETED", // Old sales are already completed
          payment_method: "CASH", // Default payment method
          payment_status: "PAID", // Assume old sales are paid
          order_date: sale.createdAt,
          completed_date: sale.createdAt,
          notes: "Migrated from legacy sales system",
          created_by: "MIGRATION_SCRIPT",
          is_single_item: true, // Flag to identify migrated single-item sales
          migration_source_id: sale._id // Reference to original sale
        }
        
        const salesOrder = new SalesOrder(salesOrderData)
        await salesOrder.save()
        
        migratedCount++
        console.log(`✅ Migrated sale ${sale._id} → ${salesOrder.order_number}`)
        
      } catch (error) {
        errorCount++
        console.error(`❌ Error migrating sale ${sale._id}:`, error.message)
      }
    }
    
    console.log(`\n🎉 Migration completed!`)
    console.log(`   ✅ Successfully migrated: ${migratedCount} sales`)
    console.log(`   ❌ Errors: ${errorCount} sales`)
    console.log(`   📊 Total processed: ${existingSales.length} sales`)
    
    // Optional: Mark original sales as migrated (don't delete to preserve data)
    await Sale.updateMany({}, { 
      $set: { 
        migrated_to_sales_order: true,
        migration_date: new Date()
      }
    })
    
    console.log(`✅ Original sales marked as migrated`)
    
  } catch (error) {
    console.error("❌ Migration failed:", error)
  } finally {
    await mongoose.connection.close()
    console.log("📁 Database connection closed")
  }
}

// Run migration
if (require.main === module) {
  migrateSalesToSalesOrders()
    .then(() => {
      console.log("✅ Migration script completed")
      process.exit(0)
    })
    .catch((error) => {
      console.error("❌ Migration script failed:", error)
      process.exit(1)
    })
}

module.exports = { migrateSalesToSalesOrders }