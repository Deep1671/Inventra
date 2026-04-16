require('dotenv').config()
const mongoose = require('mongoose')

async function fixSalesCollection() {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ Connected to MongoDB')

    const db = mongoose.connection.db

    // Get collection info
    const collections = await db.listCollections({ name: 'sales' }).toArray()

    if (collections.length > 0) {
      console.log('\n📊 Current Sales Collection Info:')
      console.log(JSON.stringify(collections[0], null, 2))

      // Drop the collection and recreate it
      console.log('\n🗑️  Dropping old sales collection...')
      await db.collection('sales').drop()
      console.log('✅ Collection dropped')

      // The model will recreate it properly on next insert
      console.log('\n✅ Collection will be recreated on next insert')
    } else {
      console.log('\n✅ Sales collection does not exist yet')
    }

    await mongoose.disconnect()
    console.log('\n✅ Done!')
    process.exit(0)

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

fixSalesCollection()
