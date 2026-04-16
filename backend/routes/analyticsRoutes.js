const express = require("express")
const router = express.Router()

const Sale = require("../models/sale")
const Product = require("../models/product")

const authMiddleware = require("../middleware/authmiddleware")
const roleMiddleware = require("../middleware/rolemiddleware")

router.use(authMiddleware)
router.use(roleMiddleware(["admin","manager"]))

router.get("/overview", async (req,res)=>{

try{

/* TODAY REVENUE */

const start = new Date()
start.setHours(0,0,0,0)

const end = new Date()
end.setHours(23,59,59,999)
const todayRevenue = await Sale.aggregate([
{
$match:{
createdAt:{ $gte: start, $lte: end }
}
},
{
$group:{
_id:null,
revenue:{ $sum:"$revenue" }
}
}
])


/* LOW STOCK */

const lowStock = await Product.find({
$expr:{ $lte:["$current_stock","$reorder_point"] }
})


/* TOP PRODUCT */

const topProduct = await Sale.aggregate([
{
$group:{
_id:"$product_id",
total:{ $sum:"$quantity_sold" },
productName:{ $first:"$product_name" }
}
},
{ $sort:{ total:-1 } },
{ $limit:1 },
{
$project:{
name:"$productName",
quantity_sold:"$total"
}
}
])


/* RECENT SALES */

const recentSales = await Sale.find()
.sort({ createdAt: -1 })
.limit(5)
.lean()

const formattedSales = recentSales.map((sale) => ({
_id: sale._id,
product_name: sale.product_name,
quantity_sold: sale.quantity_sold,
revenue: sale.revenue
}))

res.json({

today_revenue: todayRevenue[0]?.revenue || 0,

low_stock_alerts: lowStock,

top_product: topProduct[0] || null,

recent_sales: formattedSales


})

}catch(err){

console.error(err)
res.status(500).json({message:"Dashboard overview error"})

}

})

module.exports = router
