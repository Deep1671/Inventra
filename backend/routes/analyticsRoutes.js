const express = require("express")
const router = express.Router()

const Sale = require("../models/sale")
const SalesOrder = require("../models/salesOrder")
const Product = require("../models/product")
const PurchaseOrder = require("../models/purchaseOrder")
const Supplier = require("../models/supplier")
const Inventory = require("../models/inventory")

const authMiddleware = require("../middleware/authmiddleware")
const roleMiddleware = require("../middleware/rolemiddleware")

/* ======================== DEBUG - Product Ages (NO AUTH) ======================== */
router.get("/debug/product-ages", async (req,res)=>{
try{
  const products = await Product.find({}).lean()
  const productAges = products.map(p => {
    const createdDate = p.createdAt ? new Date(p.createdAt) : new Date()
    const ageDays = Math.floor((new Date() - createdDate) / (1000 * 60 * 60 * 24))
    return {
      name: p.name,
      createdAt: createdDate,
      ageDays: ageDays,
      currentStock: p.current_stock
    }
  })
  res.json({ products: productAges, total: products.length })
}catch(err){
  res.status(500).json({error: err.message})
}
})

router.use(authMiddleware)
router.use(roleMiddleware(["admin","manager"]))

const getOrderDateInRangeQuery = (startDate, endDate) => ({
  $or: [
    { completed_date: { $gte: startDate, $lte: endDate } },
    {
      completed_date: null,
      createdAt: { $gte: startDate, $lte: endDate }
    }
  ]
})

const normalizeSaleDate = (sale) => {
  const rawDate = sale.createdAt || sale.completed_date || sale.order_date
  const parsed = rawDate ? new Date(rawDate) : null

  if (!parsed || Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed
}

const mapOrderItemsToSales = (orders) => {
  const mapped = []

  orders.forEach((order) => {
    const saleDate = order.completed_date || order.createdAt || order.order_date || new Date()
    order.items.forEach((item, index) => {
      const revenue = typeof item.subtotal === "number"
        ? item.subtotal
        : (item.quantity || 0) * (item.unit_price || 0)

      mapped.push({
        _id: `${order._id}-${index}`,
        product_name: item.product_name,
        quantity_sold: item.quantity || 0,
        revenue,
        createdAt: saleDate
      })
    })
  })

  return mapped
}

const getSalesSnapshotForPeriod = async (startDate, endDate) => {
  const [legacySales, completedOrders] = await Promise.all([
    Sale.find({ createdAt: { $gte: startDate, $lte: endDate } }).lean(),
    SalesOrder.find({
      status: "COMPLETED",
      ...getOrderDateInRangeQuery(startDate, endDate)
    })
      .select("items completed_date createdAt order_date")
      .lean()
  ])

  const orderItemSales = mapOrderItemsToSales(completedOrders)
  const mergedSales = [...legacySales, ...orderItemSales]

  // Defensive filter: keeps only transactions whose effective date is in range.
  return mergedSales
    .map((sale) => {
      const normalizedDate = normalizeSaleDate(sale)
      if (!normalizedDate) {
        return null
      }

      return {
        ...sale,
        createdAt: normalizedDate
      }
    })
    .filter((sale) => sale && sale.createdAt >= startDate && sale.createdAt <= endDate)
}

const getGlobalRecentSales = async (limit = 5) => {
  const [legacySales, completedOrders] = await Promise.all([
    Sale.find().sort({ createdAt: -1 }).lean(),
    SalesOrder.find({ status: "COMPLETED" })
      .select("items completed_date createdAt order_date")
      .lean()
  ])

  const orderItemSales = mapOrderItemsToSales(completedOrders)
  const mergedSales = [...legacySales, ...orderItemSales]

  return mergedSales
    .map((sale) => {
      const normalizedDate = normalizeSaleDate(sale)
      if (!normalizedDate) {
        return null
      }

      return {
        ...sale,
        createdAt: normalizedDate
      }
    })
    .filter((sale) => sale !== null)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit)
}

/* ======================== BASIC OVERVIEW ======================== */
router.get("/overview", async (req,res)=>{
try{
  const { timeFilter = "today" } = req.query
  
  const start = new Date()
  const end = new Date()
  
  if (timeFilter === "today") {
    start.setHours(0,0,0,0)
    end.setHours(23,59,59,999)
  } else if (timeFilter === "week") {
    const dayOfWeek = start.getDay()
    start.setDate(start.getDate() - dayOfWeek)
    start.setHours(0,0,0,0)
    end.setHours(23,59,59,999)
  } else if (timeFilter === "month") {
    start.setDate(start.getDate() - 30)
    start.setHours(0,0,0,0)
    end.setHours(23,59,59,999)
  } else if (timeFilter === "year") {
    start.setMonth(0, 1)
    start.setHours(0,0,0,0)
    end.setHours(23,59,59,999)
  }
  
  const currentPeriodSales = await getSalesSnapshotForPeriod(start, end)

  // Calculate previous period revenue for comparison
  const prevStart = new Date(start)
  const prevEnd = new Date(start)
  
  if (timeFilter === "today") {
    prevStart.setDate(prevStart.getDate() - 1)
    prevStart.setHours(0,0,0,0)
    prevEnd.setDate(prevEnd.getDate() - 1)
    prevEnd.setHours(23,59,59,999)
  } else if (timeFilter === "week") {
    prevStart.setDate(prevStart.getDate() - 7)
    prevStart.setHours(0,0,0,0)
    prevEnd.setDate(prevEnd.getDate() - 7)
    prevEnd.setHours(23,59,59,999)
  } else if (timeFilter === "month") {
    prevStart.setDate(prevStart.getDate() - 60)
    prevStart.setHours(0,0,0,0)
    prevEnd.setDate(prevEnd.getDate() - 30)
    prevEnd.setHours(23,59,59,999)
  } else if (timeFilter === "year") {
    prevStart.setFullYear(prevStart.getFullYear() - 1)
    prevStart.setMonth(0, 1)
    prevStart.setHours(0,0,0,0)
    prevEnd.setFullYear(prevEnd.getFullYear() - 1)
    prevEnd.setMonth(11, 31)
    prevEnd.setHours(23,59,59,999)
  }

  const previousPeriodSales = await getSalesSnapshotForPeriod(prevStart, prevEnd)

  // Calculate percentage change
  const currentRev = currentPeriodSales.reduce((sum, sale) => sum + (sale.revenue || 0), 0)
  const prevRev = previousPeriodSales.reduce((sum, sale) => sum + (sale.revenue || 0), 0)
  let percentageChange = 0
  if (prevRev > 0) {
    percentageChange = ((currentRev - prevRev) / prevRev) * 100
  } else if (currentRev > 0) {
    percentageChange = 100
  }

  const lowStock = await Product.find({
    $expr:{ $lte:["$current_stock","$reorder_point"] }
  })

  // Get global top product (all-time, not limited by time filter)
  const globalTopProductMap = {}
  const [allLegacySales, allCompletedOrders] = await Promise.all([
    Sale.find({}).lean(),
    SalesOrder.find({ status: "COMPLETED" }).select("items").lean()
  ])

  // Process all legacy sales
  allLegacySales.forEach((sale) => {
    const key = sale.product_name || "Unknown Product"
    globalTopProductMap[key] = (globalTopProductMap[key] || 0) + (sale.quantity_sold || 0)
  })

  // Process all completed orders
  allCompletedOrders.forEach((order) => {
    order.items?.forEach((item) => {
      const key = item.product_name || "Unknown Product"
      globalTopProductMap[key] = (globalTopProductMap[key] || 0) + (item.quantity || 0)
    })
  })

  const topProductEntry = Object.entries(globalTopProductMap)
    .sort((a, b) => b[1] - a[1])[0]

  // Get local top product (for current time period)
  const topProductMap = {}
  currentPeriodSales.forEach((sale) => {
    const key = sale.product_name || "Unknown Product"
    topProductMap[key] = (topProductMap[key] || 0) + (sale.quantity_sold || 0)
  })

  const topProductEntryLocal = Object.entries(topProductMap)
    .sort((a, b) => b[1] - a[1])[0]

  const recentSales = await getGlobalRecentSales(5)

  const formattedSales = recentSales.map((sale) => ({
    _id: sale._id,
    product_name: sale.product_name,
    quantity_sold: sale.quantity_sold,
    revenue: sale.revenue,
    createdAt: sale.createdAt
  }))

  res.json({
    today_revenue: currentRev,
    revenue_change_percentage: parseFloat(percentageChange.toFixed(1)),
    low_stock_alerts: lowStock,
    top_product: topProductEntry
      ? { name: topProductEntry[0], quantity_sold: topProductEntry[1], type: "global" }
      : null,
    top_product_period: topProductEntryLocal
      ? { name: topProductEntryLocal[0], quantity_sold: topProductEntryLocal[1], type: "period" }
      : null,
    recent_sales: formattedSales
  })
}catch(err){
  console.error(err)
  res.status(500).json({message:"Dashboard overview error"})
}
})

/* ======================== REVENUE TRENDS ======================== */
router.get("/revenue-trends", async (req,res)=>{
try{
  const { period = 'weekly', startDate: queryStartDate, endDate: queryEndDate } = req.query
  
  let dateFormat = "%Y-%m-%d"
  let daysBack = 7
  let groupByWeek = false
  let groupByMonth = false
  let groupByYear = false
  let queryAllData = false

  if(period === 'daily') {
    // Fetch last 15 days for daily view
    daysBack = 15
    dateFormat = "%Y-%m-%d"
  } else if(period === 'weekly') {
    // Fetch last 12 weeks for weekly view
    daysBack = 84
    dateFormat = "%G-W%V"
    groupByWeek = true
  } else if(period === 'monthly') {
    daysBack = 365
    dateFormat = "%Y-%m"
    groupByMonth = true
  } else if(period === 'yearly') {
    // Fetch ALL historical data for yearly view
    queryAllData = true
    dateFormat = "%Y"
    groupByYear = true
  }

  let startDate = new Date()
  let endDate = new Date()
  
  // If custom date range is provided, use it
  if (queryStartDate && queryEndDate) {
    startDate = new Date(queryStartDate)
    endDate = new Date(queryEndDate)
    endDate.setHours(23, 59, 59, 999)
    queryAllData = false
  } else if (!queryAllData) {
    startDate.setDate(startDate.getDate() - daysBack)
  }

  // Fetch from both Sale and SalesOrder
  const [legacySales, completedOrders] = await Promise.all([
    Sale.aggregate([
      ...(queryAllData ? [] : [{ $match: { createdAt: { $gte: startDate, $lte: endDate } } }]),
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
          revenue: { $sum: "$revenue" },
          sales_count: { $sum: 1 },
          quantity: { $sum: "$quantity_sold" }
        }
      }
    ]),
    SalesOrder.aggregate([
      {
        $match: {
          status: "COMPLETED",
          ...(queryAllData ? {} : {
            $or: [
              { completed_date: { $gte: startDate, $lte: endDate } },
              { $and: [{ completed_date: null }, { createdAt: { $gte: startDate, $lte: endDate } }] }
            ]
          })
        }
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: {
            $dateToString: {
              format: dateFormat,
              date: { $ifNull: ["$completed_date", "$createdAt"] }
            }
          },
          revenue: {
            $sum: {
              $cond: [
                { $isNumber: "$items.subtotal" },
                "$items.subtotal",
                { $multiply: ["$items.quantity", "$items.unit_price"] }
              ]
            }
          },
          sales_count: { $sum: 1 },
          quantity: { $sum: "$items.quantity" }
        }
      }
    ])
  ])

  // Merge results by date
  const mergedTrends = {}
  
  legacySales.forEach(sale => {
    mergedTrends[sale._id] = {
      _id: sale._id,
      revenue: sale.revenue,
      sales_count: sale.sales_count,
      quantity: sale.quantity
    }
  })

  completedOrders.forEach(order => {
    if (mergedTrends[order._id]) {
      mergedTrends[order._id].revenue += order.revenue
      mergedTrends[order._id].sales_count += order.sales_count
      mergedTrends[order._id].quantity += order.quantity
    } else {
      mergedTrends[order._id] = {
        _id: order._id,
        revenue: order.revenue,
        sales_count: order.sales_count,
        quantity: order.quantity
      }
    }
  })

  // Sort by date
  let trends = Object.values(mergedTrends).sort((a, b) => a._id.localeCompare(b._id))

  // For daily view with all historical data, no need to fill missing days
  // Just return all days that have transactions sorted chronologically

  // For daily view, add cumulative data as well
  if (period === 'daily') {
    let cumulativeRevenue = 0
    trends = trends.map(item => {
      cumulativeRevenue += item.revenue
      return {
        ...item,
        cumulative_revenue: cumulativeRevenue
      }
    })
  }

  // For weekly view, add date range labels
  if (period === 'weekly') {
    trends = trends.map(item => {
      // Parse week string format "YYYY-WXX" to get actual date range
      const [year, week] = item._id.split('-W')
      const weekNum = parseInt(week)
      
      // Calculate Monday of that week
      const jan4 = new Date(parseInt(year), 0, 4)
      const dayOffset = jan4.getDay() - 1
      const weekStartDate = new Date(jan4)
      weekStartDate.setDate(jan4.getDate() - dayOffset + (weekNum - 1) * 7)
      
      const weekEndDate = new Date(weekStartDate)
      weekEndDate.setDate(weekStartDate.getDate() + 6)
      
      const startFormatted = weekStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const endFormatted = weekEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      
      return {
        ...item,
        date_range: `${startFormatted} - ${endFormatted}`
      }
    })
  }

  // For monthly view, add readable month labels
  if (period === 'monthly') {
    trends = trends.map(item => {
      const [year, month] = item._id.split('-')
      const monthDate = new Date(parseInt(year), parseInt(month) - 1)
      const monthFormatted = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      
      return {
        ...item,
        date_range: monthFormatted
      }
    })
  }

  // For yearly view, add readable year labels
  if (period === 'yearly') {
    trends = trends.map(item => {
      const year = item._id
      return {
        ...item,
        date_range: `Year ${year}`
      }
    })
  }

  res.json({ trends })
}catch(err){
  console.error(err)
  res.status(500).json({message:"Revenue trends error"})
}
})

/* ======================== TOP PRODUCTS ======================== */
router.get("/top-products", async (req,res)=>{
try{
  const { sortBy = "revenue" } = req.query
  
  let sortField = { total_revenue: -1 }
  if (sortBy === "quantity") {
    sortField = { total_quantity: -1 }
  }

  // Fetch from both Sale and SalesOrder with real product names via lookup
  const [legacyProducts, orderProducts] = await Promise.all([
    Sale.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "product_id",
          foreignField: "_id",
          as: "product_info"
        }
      },
      { $unwind: { path: "$product_info", preserveNullAndEmptyArrays: true } },
      {$group:{
        _id:"$product_id",
        product_name: { $first: "$product_info.name" },
        total_revenue:{ $sum:"$revenue" },
        total_quantity:{ $sum:"$quantity_sold" },
        unit_price:{ $avg:{ $divide:["$revenue","$quantity_sold"] } },
        sales_count:{ $sum:1 }
      }}
    ]),
    SalesOrder.aggregate([
      { $match: { status: "COMPLETED" } },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product_id",
          foreignField: "_id",
          as: "product_info"
        }
      },
      { $unwind: { path: "$product_info", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$items.product_id",
          product_name: { $first: "$product_info.name" },
          total_revenue: {
            $sum: {
              $cond: [
                { $isNumber: "$items.subtotal" },
                "$items.subtotal",
                { $multiply: ["$items.quantity", "$items.unit_price"] }
              ]
            }
          },
          total_quantity: { $sum: "$items.quantity" },
          unit_price: { $avg: "$items.unit_price" },
          sales_count: { $sum: 1 }
        }
      }
    ])
  ])

  // Merge results
  const mergedProducts = {}
  
  legacyProducts.forEach(prod => {
    if (prod._id) {
      mergedProducts[prod._id] = {
        _id: prod._id,
        product_name: prod.product_name,
        total_revenue: prod.total_revenue,
        total_quantity: prod.total_quantity,
        unit_price: prod.unit_price,
        sales_count: prod.sales_count
      }
    }
  })

  orderProducts.forEach(prod => {
    if (prod._id) {
      if (mergedProducts[prod._id]) {
        mergedProducts[prod._id].total_revenue += prod.total_revenue
        mergedProducts[prod._id].total_quantity += prod.total_quantity
        mergedProducts[prod._id].unit_price = (mergedProducts[prod._id].unit_price + prod.unit_price) / 2
        mergedProducts[prod._id].sales_count += prod.sales_count
      } else {
        mergedProducts[prod._id] = {
          _id: prod._id,
          product_name: prod.product_name,
          total_revenue: prod.total_revenue,
          total_quantity: prod.total_quantity,
          unit_price: prod.unit_price,
          sales_count: prod.sales_count
        }
      }
    }
  })

  const topByRevenue = Object.values(mergedProducts)
    .sort((a, b) => sortBy === "quantity" ? b.total_quantity - a.total_quantity : b.total_revenue - a.total_revenue)
    .slice(0, 10)
    .map(p => ({
      product_name: p.product_name,
      total_revenue: p.total_revenue,
      total_quantity: p.total_quantity,
      unit_price: Math.round(p.unit_price * 100) / 100,
      sales_count: p.sales_count
    }))

  res.json({ top_products: topByRevenue })
}catch(err){
  console.error(err)
  res.status(500).json({message:"Top products error"})
}
})

/* ======================== PROFIT ANALYSIS ======================== */
router.get("/profit-analysis", async (req,res)=>{
try{
  // Fetch from both Sale and SalesOrder with real product names
  const [legacyProfit, orderProfit] = await Promise.all([
    Sale.aggregate([
      {
        $lookup: {
          from: "products",
          let: { product_id: "$product_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$product_id"] } } },
            { $project: { name: 1, cost_price: 1, selling_price: 1 } }
          ],
          as: "product_info"
        }
      },
      { $unwind: { path: "$product_info", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$product_id",
          product_name: { $first: "$product_info.name" },
          total_revenue: { $sum: "$revenue" },
          total_quantity: { $sum: "$quantity_sold" },
          cost_price: { $first: "$product_info.cost_price" },
          selling_price: { $first: "$product_info.selling_price" }
        }
      }
    ]),
    SalesOrder.aggregate([
      { $match: { status: "COMPLETED" } },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          let: { product_id: "$items.product_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$product_id"] } } },
            { $project: { name: 1, cost_price: 1, selling_price: 1 } }
          ],
          as: "product_info"
        }
      },
      { $unwind: { path: "$product_info", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$items.product_id",
          product_name: { $first: "$product_info.name" },
          total_revenue: {
            $sum: {
              $cond: [
                { $isNumber: "$items.subtotal" },
                "$items.subtotal",
                { $multiply: ["$items.quantity", "$items.unit_price"] }
              ]
            }
          },
          total_quantity: { $sum: "$items.quantity" },
          cost_price: { $first: "$product_info.cost_price" },
          selling_price: { $first: "$product_info.selling_price" }
        }
      }
    ])
  ])

  // Merge results
  const mergedProfit = {}
  
  legacyProfit.forEach(prod => {
    if (prod._id) {
      mergedProfit[prod._id] = prod
    }
  })

  orderProfit.forEach(prod => {
    if (prod._id) {
      if (mergedProfit[prod._id]) {
        mergedProfit[prod._id].total_revenue += prod.total_revenue
        mergedProfit[prod._id].total_quantity += prod.total_quantity
      } else {
        mergedProfit[prod._id] = prod
      }
    }
  })

  // Calculate profit for merged data
  const allProfitData = Object.values(mergedProfit)
    .map(p => ({
      ...p,
      total_cost: (p.cost_price || 0) * p.total_quantity,
      total_profit: p.total_revenue - ((p.cost_price || 0) * p.total_quantity),
      profit_margin: p.total_revenue > 0 ? (p.total_revenue - ((p.cost_price || 0) * p.total_quantity)) / p.total_revenue * 100 : 0
    }))
  
  // Get top 10 for display table
  const profitData = allProfitData
    .sort((a, b) => b.total_profit - a.total_profit)
    .slice(0, 10)

  // Calculate totals from ALL products (not just top 10)
  const totalProfitAllProducts = allProfitData.reduce((sum, item) => sum + (item.total_profit || 0), 0)
  const totalRevenueAllProducts = allProfitData.reduce((sum, item) => sum + (item.total_revenue || 0), 0)
  
  // For display: use top 10 data
  const totalProfit = profitData.reduce((sum, item) => sum + (item.total_profit || 0), 0)
  const totalRevenue = profitData.reduce((sum, item) => sum + (item.total_revenue || 0), 0)

  res.json({
    products: profitData.map(p => ({
      product_name: p.product_name,
      total_revenue: Math.round(p.total_revenue),
      total_quantity: p.total_quantity,
      cost_price: p.cost_price || 0,
      selling_price: p.selling_price || 0,
      total_cost: Math.round(p.total_cost),
      total_profit: Math.round(p.total_profit),
      profit_margin: parseFloat(p.profit_margin?.toFixed(2) || 0)
    })),
    summary: {
      total_profit: Math.round(totalProfitAllProducts),
      total_revenue: Math.round(totalRevenueAllProducts),
      overall_margin: totalRevenueAllProducts > 0 ? parseFloat(((totalProfitAllProducts / totalRevenueAllProducts) * 100).toFixed(2)) : 0
    }
  })
}catch(err){
  console.error(err)
  res.status(500).json({message:"Profit analysis error"})
}
})

/* ======================== INVENTORY TURNOVER ======================== */
router.get("/inventory-turnover", async (req,res)=>{
try{
  // Fetch all products with their thresholds
  const allProducts = await Product.find({}).lean()
  const productThresholds = {}
  allProducts.forEach(p => {
    productThresholds[p._id.toString()] = {
      reorder_point: p.reorder_point || 0,
      low_stock_threshold: p.low_stock_threshold || 0,
      safety_stock: p.safety_stock || 0
    }
  })

  // Fetch from both Sale and SalesOrder
  const [legacyTurnover, orderTurnover] = await Promise.all([
    Sale.aggregate([
      {
        $lookup: {
          from: "products",
          let: { product_id: "$product_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$product_id"] } } },
            { $project: { current_stock: 1, cost_price: 1 } }
          ],
          as: "product_info"
        }
      },
      { $unwind: { path: "$product_info", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$product_id",
          product_name: { $first: "$product_name" },
          total_sold: { $sum: "$quantity_sold" },
          current_stock: { $first: "$product_info.current_stock" },
          times_sold: { $sum: 1 }
        }
      }
    ]),
    SalesOrder.aggregate([
      { $match: { status: "COMPLETED" } },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          let: { product_id: "$items.product_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$product_id"] } } },
            { $project: { current_stock: 1, cost_price: 1 } }
          ],
          as: "product_info"
        }
      },
      { $unwind: { path: "$product_info", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$items.product_id",
          product_name: { $first: "$items.product_name" },
          total_sold: { $sum: "$items.quantity" },
          current_stock: { $first: "$product_info.current_stock" },
          times_sold: { $sum: 1 }
        }
      }
    ])
  ])

  // Merge results
  const mergedTurnover = {}
  
  legacyTurnover.forEach(prod => {
    if (prod._id) {
      mergedTurnover[prod._id] = prod
    }
  })

  orderTurnover.forEach(prod => {
    if (prod._id) {
      if (mergedTurnover[prod._id]) {
        mergedTurnover[prod._id].total_sold += prod.total_sold
        mergedTurnover[prod._id].times_sold += prod.times_sold
      } else {
        mergedTurnover[prod._id] = prod
      }
    }
  })

  const turnover = Object.values(mergedTurnover)
    .map(p => {
      const productId = p._id.toString()
      const thresholds = productThresholds[productId] || { reorder_point: 0, low_stock_threshold: 0 }
      const currentStock = p.current_stock || 0
      const reorderPoint = thresholds.reorder_point
      const lowStockThreshold = thresholds.low_stock_threshold || reorderPoint / 2
      
      // Determine stock status based on product's specific thresholds
      let stock_status = "High"
      if (currentStock <= lowStockThreshold) {
        stock_status = "Critical"
      } else if (currentStock <= reorderPoint) {
        stock_status = "Low"
      } else if (currentStock <= reorderPoint * 1.5) {
        stock_status = "Medium"
      }
      
      return {
        product_name: p.product_name,
        total_sold: p.total_sold,
        current_stock: currentStock,
        times_sold: p.times_sold,
        days_in_stock: p.total_sold > 0 ? Math.round((currentStock * 30) / p.total_sold) : 999,
        reorder_point: reorderPoint,
        low_stock_threshold: lowStockThreshold,
        stock_status
      }
    })
    .sort((a, b) => b.total_sold - a.total_sold)

  res.json({ turnover })
}catch(err){
  console.error(err)
  res.status(500).json({message:"Inventory turnover error"})
}
})

/* ======================== SUPPLIER PERFORMANCE ======================== */
router.get("/supplier-performance", async (req,res)=>{
try{
  const performance = await PurchaseOrder.aggregate([
    {
      $lookup: {
        from: "suppliers",
        localField: "supplier_id",
        foreignField: "_id",
        as: "supplier"
      }
    },
    { $unwind: { path: "$supplier", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: "$supplier_id",
        supplier_name: { $first: "$supplier.name" },
        total_orders: { $sum: 1 },
        total_spent: { $sum: "$total_amount" },
        completed_orders: { $sum: { $cond: [{ $eq: ["$status", "DELIVERED"] }, 1, 0] } },
        pending_orders: { $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] } },
        cancelled_orders: { $sum: { $cond: [{ $eq: ["$status", "CANCELLED"] }, 1, 0] } }
      }
    },
    {
      $project: {
        supplier_name: 1,
        total_orders: 1,
        total_spent: 1,
        completed_orders: 1,
        pending_orders: 1,
        cancelled_orders: 1,
        on_time_rate: {
          $multiply: [
            { $divide: ["$completed_orders", { $max: ["$total_orders", 1] }] },
            100
          ]
        },
        reliability_score: {
          $subtract: [100, { $multiply: [{ $divide: ["$cancelled_orders", { $max: ["$total_orders", 1] }] }, 100] }]
        }
      }
    },
    { $sort: { total_spent: -1 } },
    { $limit: 10 }
  ])

  res.json({
    suppliers: performance.map(s => ({
      ...s,
      on_time_rate: parseFloat(s.on_time_rate?.toFixed(2) || 0),
      reliability_score: parseFloat(s.reliability_score?.toFixed(2) || 0),
      total_spent: Math.round(s.total_spent)
    }))
  })
}catch(err){
  console.error(err)
  res.status(500).json({message:"Supplier performance error"})
}
})

/* ======================== CATEGORY ANALYSIS ======================== */
router.get("/category-analysis", async (req,res)=>{
try{
  // Fetch from both Sale and SalesOrder
  const [legacyCategories, orderCategories] = await Promise.all([
    Sale.aggregate([
      {
        $lookup: {
          from: "products",
          let: { product_id: "$product_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$product_id"] } } },
            { $project: { category: 1, cost_price: 1 } }
          ],
          as: "product_info"
        }
      },
      { $unwind: { path: "$product_info", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$product_info.category",
          total_revenue: { $sum: "$revenue" },
          total_quantity: { $sum: "$quantity_sold" },
          total_cost: { $sum: { $multiply: ["$product_info.cost_price", "$quantity_sold"] } },
          sales_count: { $sum: 1 }
        }
      }
    ]),
    SalesOrder.aggregate([
      { $match: { status: "COMPLETED" } },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          let: { product_id: "$items.product_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$product_id"] } } },
            { $project: { category: 1, cost_price: 1 } }
          ],
          as: "product_info"
        }
      },
      { $unwind: { path: "$product_info", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$product_info.category",
          total_revenue: {
            $sum: {
              $cond: [
                { $isNumber: "$items.subtotal" },
                "$items.subtotal",
                { $multiply: ["$items.quantity", "$items.unit_price"] }
              ]
            }
          },
          total_quantity: { $sum: "$items.quantity" },
          total_cost: { $sum: { $multiply: ["$product_info.cost_price", "$items.quantity"] } },
          sales_count: { $sum: 1 }
        }
      }
    ])
  ])

  // Merge results
  const mergedCategories = {}
  
  legacyCategories.forEach(cat => {
    const categoryKey = cat._id || "Undefined"
    mergedCategories[categoryKey] = cat
  })

  orderCategories.forEach(cat => {
    const categoryKey = cat._id || "Undefined"
    if (mergedCategories[categoryKey]) {
      mergedCategories[categoryKey].total_revenue += cat.total_revenue
      mergedCategories[categoryKey].total_quantity += cat.total_quantity
      mergedCategories[categoryKey].total_cost += cat.total_cost
      mergedCategories[categoryKey].sales_count += cat.sales_count
    } else {
      mergedCategories[categoryKey] = cat
    }
  })

  const categories = Object.values(mergedCategories)
    .map(c => ({
      category: c._id || "Undefined",
      total_revenue: c.total_revenue,
      total_quantity: c.total_quantity,
      total_cost: c.total_cost,
      sales_count: c.sales_count,
      profit: c.total_revenue - c.total_cost,
      profit_margin: c.total_revenue > 0 ? (c.total_revenue - c.total_cost) / c.total_revenue * 100 : 0
    }))
    .sort((a, b) => b.profit_margin - a.profit_margin)

  res.json({
    categories: categories.map(c => ({
      category: c.category,
      total_revenue: Math.round(c.total_revenue),
      total_quantity: c.total_quantity,
      total_cost: Math.round(c.total_cost),
      sales_count: c.sales_count,
      profit: Math.round(c.profit),
      profit_margin: Math.max(0, Math.min(100, parseFloat(c.profit_margin.toFixed(2))))
    }))
  })
}catch(err){
  console.error(err)
  res.status(500).json({message:"Category analysis error"})
}
})

/* ======================== QUANTITY SOLD MATRIX ======================== */
router.get("/quantity-sold-matrix", async (req,res)=>{
try{
  // Get all product totals from both sources with real product names
  const [legacyProductTotals, orderProductTotals] = await Promise.all([
    Sale.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "product_id",
          foreignField: "_id",
          as: "product_info"
        }
      },
      { $unwind: { path: "$product_info", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$product_id",
          product_name: { $first: "$product_info.name" },
          total_quantity: { $sum: "$quantity_sold" }
        }
      }
    ]),
    SalesOrder.aggregate([
      { $match: { status: "COMPLETED" } },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product_id",
          foreignField: "_id",
          as: "product_info"
        }
      },
      { $unwind: { path: "$product_info", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$items.product_id",
          product_name: { $first: "$product_info.name" },
          total_quantity: { $sum: "$items.quantity" }
        }
      }
    ])
  ])

  // Merge product totals
  const mergedProductTotals = {}
  legacyProductTotals.forEach(p => {
    if (p._id) {
      mergedProductTotals[String(p._id)] = {
        _id: String(p._id),
        product_name: p.product_name,
        total_quantity: p.total_quantity
      }
    }
  })

  orderProductTotals.forEach(p => {
    if (p._id) {
      const key = String(p._id)
      if (mergedProductTotals[key]) {
        mergedProductTotals[key].total_quantity += p.total_quantity
      } else {
        mergedProductTotals[key] = {
          _id: key,
          product_name: p.product_name,
          total_quantity: p.total_quantity
        }
      }
    }
  })

  const productTotalsFormatted = Object.values(mergedProductTotals)
    .sort((a, b) => b.total_quantity - a.total_quantity)
    .slice(0, 20)

  // Get quantity by category and product from both sources with real names
  const [legacyMatrixData, orderMatrixData] = await Promise.all([
    Sale.aggregate([
      {
        $lookup: {
          from: "products",
          let: { product_id: "$product_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$product_id"] } } },
            { $project: { name: 1, category: 1 } }
          ],
          as: "product_info"
        }
      },
      { $unwind: { path: "$product_info", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            product_id: { $toString: "$product_id" },
            product_name: "$product_info.name",
            category: "$product_info.category"
          },
          quantity: { $sum: "$quantity_sold" }
        }
      }
    ]),
    SalesOrder.aggregate([
      { $match: { status: "COMPLETED" } },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          let: { product_id: "$items.product_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$product_id"] } } },
            { $project: { name: 1, category: 1 } }
          ],
          as: "product_info"
        }
      },
      { $unwind: { path: "$product_info", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            product_id: { $toString: "$items.product_id" },
            product_name: "$product_info.name",
            category: "$product_info.category"
          },
          quantity: { $sum: "$items.quantity" }
        }
      }
    ])
  ])

  // Merge matrix data
  const mergedMatrixMap = {}
  legacyMatrixData.forEach(item => {
    const key = `${item._id.product_id}|${item._id.product_name}|${item._id.category}`
    mergedMatrixMap[key] = item
  })

  orderMatrixData.forEach(item => {
    const key = `${item._id.product_id}|${item._id.product_name}|${item._id.category}`
    if (mergedMatrixMap[key]) {
      mergedMatrixMap[key].quantity += item.quantity
    } else {
      mergedMatrixMap[key] = item
    }
  })

  const matrixData = Object.values(mergedMatrixMap).sort((a, b) => {
    const catCompare = (a._id.category || "").localeCompare(b._id.category || "")
    return catCompare !== 0 ? catCompare : b.quantity - a.quantity
  })

  // Get categories from both sources
  const [legacyCategories, orderCategories] = await Promise.all([
    Sale.aggregate([
      {
        $lookup: {
          from: "products",
          let: { product_id: "$product_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$product_id"] } } },
            { $project: { category: 1 } }
          ],
          as: "product_info"
        }
      },
      { $unwind: { path: "$product_info", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$product_info.category",
          total_quantity: { $sum: "$quantity_sold" }
        }
      }
    ]),
    SalesOrder.aggregate([
      { $match: { status: "COMPLETED" } },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          let: { product_id: "$items.product_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$product_id"] } } },
            { $project: { category: 1 } }
          ],
          as: "product_info"
        }
      },
      { $unwind: { path: "$product_info", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$product_info.category",
          total_quantity: { $sum: "$items.quantity" }
        }
      }
    ])
  ])

  // Merge categories
  const mergedCategoriesMap = {}
  legacyCategories.forEach(cat => {
    if (cat._id) {
      mergedCategoriesMap[cat._id] = cat
    }
  })

  orderCategories.forEach(cat => {
    if (cat._id) {
      if (mergedCategoriesMap[cat._id]) {
        mergedCategoriesMap[cat._id].total_quantity += cat.total_quantity
      } else {
        mergedCategoriesMap[cat._id] = cat
      }
    }
  })

  const categories = Object.values(mergedCategoriesMap).sort((a, b) => b.total_quantity - a.total_quantity)

  res.json({
    matrix: matrixData,
    product_totals: productTotalsFormatted,
    categories: categories
  })
}catch(err){
  console.error(err)
  res.status(500).json({message:"Quantity sold matrix error"})
}
})

/* ======================== PERFORMANCE INDEXES WITH STOCK AGING ======================== */
router.get("/performance-indexes", async (req,res)=>{
try{
  const [legacySales, orderData, products] = await Promise.all([
    Sale.find({}).lean(),
    SalesOrder.find({ status: "COMPLETED" }).lean(),
    Product.find({}).lean()
  ])

  // Stock status penalties now used directly (no need for inventory transactions)

  // Stock status penalties now used directly in product processing

  // Calculate aggregate metrics
  let totalRevenue = 0
  let totalProfit = 0
  let totalCost = 0
  let totalQuantitySold = 0
  let totalStockValue = 0
  let totalStockAgePenalty = 0
  let profitableProducts = 0
  let unprofitableProducts = 0

  const productMetrics = {}
  const categoryMetrics = {}

  // Process Sales
  legacySales.forEach(sale => {
    const product = products.find(p => p._id.toString() === sale.product_id.toString())
    if (product) {
      const revenue = sale.quantity_sold * product.selling_price
      const cost = sale.quantity_sold * product.cost_price
      const profit = revenue - cost

      totalRevenue += revenue
      totalProfit += profit
      totalCost += cost
      totalQuantitySold += sale.quantity_sold

      if (!productMetrics[sale.product_id]) {
        productMetrics[sale.product_id] = {
          name: sale.product_name,
          category: product.category,
          revenue: 0, cost: 0, profit: 0, qty: 0
        }
      }
      productMetrics[sale.product_id].revenue += revenue
      productMetrics[sale.product_id].cost += cost
      productMetrics[sale.product_id].profit += profit
      productMetrics[sale.product_id].qty += sale.quantity_sold
    }
  })

  // Process Sales Orders
  orderData.forEach(order => {
    order.items?.forEach(item => {
      const product = products.find(p => p._id.toString() === item.product_id.toString())
      if (product) {
        const cost = item.quantity * product.cost_price
        const profit = item.subtotal - cost

        totalRevenue += item.subtotal
        totalProfit += profit
        totalCost += cost
        totalQuantitySold += item.quantity

        if (!productMetrics[item.product_id]) {
          productMetrics[item.product_id] = {
            name: item.product_name,
            category: product.category,
            revenue: 0, cost: 0, profit: 0, qty: 0
          }
        }
        productMetrics[item.product_id].revenue += item.subtotal
        productMetrics[item.product_id].cost += cost
        productMetrics[item.product_id].profit += profit
        productMetrics[item.product_id].qty += item.quantity
      }
    })
  })

  // Calculate stock metrics including aging penalty and status
  let criticalStockProducts = 0
  let lowStockProducts = 0
  let mediumStockProducts = 0
  let healthyStockProducts = 0
  
  const productAgePenalties = [] // For debugging
  
  products.forEach(product => {
    totalStockValue += (product.current_stock || 0) * product.cost_price
    
    // Calculate stock status based on product's reorder_point threshold
    const currentStock = product.current_stock || 0
    const reorderPoint = product.reorder_point || 0
    const lowStockThreshold = product.low_stock_threshold || (reorderPoint / 2)
    
    let stockStatusPenalty = 0
    if (currentStock <= lowStockThreshold) {
      criticalStockProducts++
      stockStatusPenalty = 5  // Critical stock = 5 pts penalty
    } else if (currentStock <= reorderPoint) {
      lowStockProducts++
      stockStatusPenalty = 3   // Low stock = 3 pts penalty
    } else if (currentStock <= reorderPoint * 1.5) {
      mediumStockProducts++
      stockStatusPenalty = 1   // Medium stock = 1 pt penalty
    } else {
      healthyStockProducts++
      stockStatusPenalty = 0   // Healthy stock = 0 penalty
    }
    
    totalStockAgePenalty += stockStatusPenalty
    productAgePenalties.push({
      name: product.name,
      penalty: stockStatusPenalty,
      status: currentStock <= lowStockThreshold ? 'Critical' : currentStock <= reorderPoint ? 'Low' : currentStock <= reorderPoint * 1.5 ? 'Medium' : 'Healthy',
      currentStock: product.current_stock
    })
    
    // Initialize category metrics if needed
    if (!categoryMetrics[product.category]) {
      categoryMetrics[product.category] = {
        revenue: 0, profit: 0, margin: 0, productCount: 0, profitCount: 0, totalAgePenalty: 0
      }
    }
    
    // Add status-based penalty to category
    categoryMetrics[product.category].totalAgePenalty += stockStatusPenalty
    
    const metrics = productMetrics[product._id]
    if (metrics) {
      const margin = metrics.revenue > 0 ? ((metrics.profit / metrics.revenue) * 100) : 0
      if (margin > 0) profitableProducts++
      else unprofitableProducts++

      categoryMetrics[product.category].revenue += metrics.revenue
      categoryMetrics[product.category].profit += metrics.profit
      categoryMetrics[product.category].productCount += 1
      if (margin > 0) categoryMetrics[product.category].profitCount += 1
    }
  })

  // Calculate Indexes
  const overallMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0
  const profitabilityScore = Math.min(100, Math.max(0, overallMargin * 2.5)) // 0-100 scale
  
  const totalProducts = products.length
  const profitableRatio = totalProducts > 0 ? (profitableProducts / totalProducts) * 100 : 0
  
  // Calculate stock health percentage (primary metric)
  const stockHealthPercentage = totalProducts > 0 ? ((healthyStockProducts / totalProducts) * 100) : 0
  
  // Inventory Health Score based on stock health percentage (primary)
  let inventoryHealthScore = stockHealthPercentage
  
  // Apply stock aging penalty to inventory health score
  const avgAgePenalty = totalProducts > 0 ? totalStockAgePenalty / totalProducts : 0
  inventoryHealthScore = Math.max(0, inventoryHealthScore - avgAgePenalty)
  
  const avgStockTurnover = totalQuantitySold > 0 ? (totalQuantitySold / (totalProducts || 1)) : 0
  const stockEfficiency = totalStockValue > 0 ? (totalRevenue / totalStockValue) : 0
  
  // Debug logging
  console.log("\n📊 AGING INDEX DEBUG:")
  console.log("Total Products:", totalProducts)
  console.log("Total Stock Age Penalty:", totalStockAgePenalty)
  console.log("Avg Age Penalty:", Math.round(totalStockAgePenalty/totalProducts * 100)/100)
  console.log("Sample product penalties:", productAgePenalties.slice(0, 5))
  
  // Category performance
  const categoryIndexes = Object.entries(categoryMetrics).map(([cat, metrics]) => {
    const avgAgePenalty = metrics.productCount > 0 ? metrics.totalAgePenalty / metrics.productCount : 0
    // Aging Index: cumulative penalty for the category
    const agingIndex = metrics.totalAgePenalty
    
    
    return {
      category: cat,
      profitability: metrics.revenue > 0 ? ((metrics.profit / metrics.revenue) * 100) : 0,
      productCount: metrics.productCount,
      profitableCount: metrics.profitCount,
      healthStatus: metrics.profitCount / metrics.productCount > 0.7 ? 'Healthy' : 'Needs Attention',
      totalAgePenalty: Math.round(metrics.totalAgePenalty),
      avgAgePenalty: Math.round(avgAgePenalty * 100) / 100,
      agingIndex: Math.round(agingIndex)
    }
  })

  res.json({
    performance_indexes: {
      profitability_index: {
        score: Math.round(profitabilityScore),
        margin_percent: Math.round(overallMargin * 100) / 100,
        profitable_products: profitableProducts,
        total_products: totalProducts,
        status: profitabilityScore > 60 ? 'Good' : profitabilityScore > 40 ? 'Fair' : 'Poor'
      },
      inventory_health_index: {
        score: Math.round(inventoryHealthScore),
        turnover_rate: Math.round(avgStockTurnover * 100) / 100,
        stock_value: Math.round(totalStockValue),
        stock_efficiency: Math.round(stockEfficiency * 100) / 100,
        total_stock_age_penalty: Math.round(totalStockAgePenalty),
        avg_age_penalty_per_product: Math.round(avgAgePenalty),
        stock_health_breakdown: {
          healthy: healthyStockProducts,
          medium: mediumStockProducts,
          low: lowStockProducts,
          critical: criticalStockProducts,
          total: totalProducts,
          healthy_percentage: Math.round(stockHealthPercentage)
        },
        status: inventoryHealthScore > 60 ? 'Healthy' : inventoryHealthScore > 40 ? 'Moderate' : 'Low'
      },
      sales_velocity_index: {
        score: Math.min(100, (totalQuantitySold / 1000) * 10),
        total_quantity_sold: totalQuantitySold,
        avg_per_product: Math.round(totalQuantitySold / (totalProducts || 1)),
        status: totalQuantitySold > 5000 ? 'Strong' : totalQuantitySold > 2000 ? 'Moderate' : 'Weak'
      },
      overall_health_index: {
        score: Math.round((profitabilityScore + inventoryHealthScore) / 2),
        status: ((profitabilityScore + inventoryHealthScore) / 2) > 60 ? 'Healthy' : 'Needs Review'
      },
      category_performance: categoryIndexes.sort((a, b) => b.profitability - a.profitability),
      debug_aging: {
        total_stock_age_penalty: Math.round(totalStockAgePenalty),
        avg_penalty_per_product: Math.round((totalStockAgePenalty / totalProducts) * 100) / 100,
        total_products: totalProducts,
        sample_product_penalties: productAgePenalties.slice(0, 5)
      }
    }
  })
}catch(err){
  console.error("Performance Indexes Error:", err)
  res.status(500).json({ error: err.message })
}
})


module.exports = router
