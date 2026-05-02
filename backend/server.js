const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
require("dotenv").config()

const app = express()

// IMPORT PERFORMANCE MIDDLEWARE
const performanceMiddleware = (req, res, next) => {
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const color = '\x1b[33m';
    console.log(`${color}[${req.method}] ${req.originalUrl} - ${res.statusCode} - ${duration}ms\x1b[0m`);
  });
  next();
};

const compressionMiddleware = (req, res, next) => {
  if (req.method !== 'GET') {
    // No cache for mutations (POST, PUT, DELETE)
    res.set('Cache-Control', 'no-cache, no-store');
  } else {
    // Strategic cache for GET requests based on endpoint type
    // Real-time endpoints: no caching (sales, inventory alerts, low stock)
    const realtimePatterns = [
      /\/api\/sales(?:\/|$)/,                    // Sales orders
      /\/api\/inventory\/alerts/,                // Low stock alerts
      /\/api\/inventory\/transactions/,          // Live inventory changes
      /\/api\/payments/,                         // Payment tracking
      /\/api\/purchase-orders/,                  // PO status
    ];

    // Cacheable endpoints: products, suppliers stay same ~5min
    const cacheablePatterns = [
      /\/api\/products$/,                        // Products list (5 min)
      /\/api\/suppliers$/,                       // Suppliers list (10 min)
      /\/api\/users$/,                           // Users list (5 min)
    ];

    // Analytics: cache only if data present (short TTL to avoid caching empty responses)
    const analyticsPatterns = [
      /\/api\/analytics/,                        // Analytics endpoints (15 min if has data)
      /\/api\/insights/,                         // Insights/reports (15 min if has data)
    ];

    const isRealtimeEndpoint = realtimePatterns.some(pattern => 
      pattern.test(req.originalUrl)
    );
    
    const isAnalyticsEndpoint = analyticsPatterns.some(pattern => 
      pattern.test(req.originalUrl)
    );
    
    const isCacheableEndpoint = cacheablePatterns.some(pattern => 
      pattern.test(req.originalUrl)
    );

    if (isAnalyticsEndpoint) {
      // Cache analytics for 15 min but will be cleared if response is empty
      res.cacheIfNotEmpty = true;
      res.set('Cache-Control', 'public, max-age=900');
    } else if (isCacheableEndpoint) {
      // Cache product/supplier data for 5 minutes
      res.set('Cache-Control', 'public, max-age=300');
    } else if (isRealtimeEndpoint) {
      // Real-time endpoints must revalidate
      res.set('Cache-Control', 'no-cache');
    } else {
      // Default: revalidate
      res.set('Cache-Control', 'no-cache');
    }
  }
  
  res.set('Access-Control-Allow-Credentials', 'true');
  next();
};

// IMPORT ROUTES
const productRoutes = require("./routes/productRoutes")
const authRoutes = require("./routes/authRoutes")
//const forecastRoutes = require("./routes/forecastRoutes")
const inventoryRoutes = require("./routes/inventoryRoutes")
const analyticsRoutes = require("./routes/analyticsRoutes")
const userRoutes = require("./routes/userRoutes")
const salesRoutes = require("./routes/salesRoutes")
const supplierRoutes = require("./routes/supplierRoutes")
const purchaseOrderRoutes = require("./routes/purchaseOrderRoutes")
const salesOrderRoutes = require("./routes/salesOrderRoutes")
const paymentRoutes = require("./routes/paymentRoutes")
const chatbotRoutes = require("./routes/chatbotRoutes")
const insightsRoutes = require("./routes/insightsRoutes")
const emailAutomation = require("./services/emailAutomationEnhanced")

// MIDDLEWARE - CORS Configuration for Production
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL || 'http://localhost:5173'
]

app.use(cors({
  origin: (origin, callback) => {
    const isVercelOrigin = typeof origin === 'string' && /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)

    if (!origin || allowedOrigins.includes(origin) || isVercelOrigin) {
      callback(null, true)
    } else {
      console.warn(`CORS request from unauthorized origin: ${origin}`)
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json())

// PERFORMANCE MIDDLEWARE
app.use(performanceMiddleware)
app.use(compressionMiddleware)

// CONNECT DATABASE
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected")
    // Initialize email automation after database connection
    emailAutomation.initializeEmailAutomation()
  })
  .catch(err => console.log("MongoDB connection error:", err))

// ROUTES
app.use("/api/products", productRoutes)
app.use("/api/auth", authRoutes)
//app.use("/api/forecast", forecastRoutes)
app.use("/api/inventory", inventoryRoutes)
app.use("/api/analytics", analyticsRoutes)
app.use("/api/Users", userRoutes)
app.use("/api/users", userRoutes)
app.use("/api/sales", salesRoutes)
app.use("/api/sales-orders", salesOrderRoutes)
app.use("/api/suppliers", supplierRoutes)
app.use("/api/purchase-orders", purchaseOrderRoutes)
app.use("/api/payments", paymentRoutes)
app.use("/api/chatbot", chatbotRoutes)
app.use("/api/insights", insightsRoutes)

// START SERVER
app.listen(5000, () => {
  console.log("Server running on port 5000")
})
