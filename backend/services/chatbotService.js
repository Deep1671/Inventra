const axios = require("axios");
const Sale = require("../models/sale");
const SalesOrder = require("../models/salesOrder");
const Product = require("../models/product");
const Supplier = require("../models/supplier");
const PurchaseOrder = require("../models/purchaseOrder");
const Payment = require("../models/payment");
const Inventory = require("../models/inventory");

// Import OpenRouter service
const { getOpenRouterService } = require("./openrouterService");

// Initialize OpenRouter as primary LLM
const llmService = getOpenRouterService();
console.log("[Chatbot] Initialized with OpenRouter API");

const API_BASE_URL = "http://localhost:5000/api";

// System prompt for Gemini
const SYSTEM_PROMPT = `You are an intelligent inventory management chatbot assistant for a smart inventory system.

Your role:
- Help users analyze their business data by answering queries in natural language
- Extract user intent and map it to specific analytics queries
- Provide insights from sales, inventory, and supplier data

Available Data Types:
1. Sales: Revenue, products sold, orders, customers (from SalesOrder model)
2. Inventory: Stock levels, warehouse locations, low stock alerts, variances (from Inventory model)
3. Suppliers: Performance metrics, payments, pending orders (from Supplier, PurchaseOrder, Payment models)

Query Templates You Can Extract:
- top_products: "Show top products", "Best selling items", "What products sold most"
- revenue_trends: "Revenue trends", "Sales growth", "Revenue last month"
- low_stock: "Low stock items", "Items below reorder", "Stock warnings"
- inventory_summary: "Inventory overview", "Total stock value", "Inventory status"
- supplier_performance: "Supplier metrics", "Best supplier", "Supplier reliability"
- sales_summary: "Total sales", "Orders count", "Sales overview"

Instructions:
1. Extract ONLY the intent from the user's query
2. Extract parameters: time_period (today/week/month/year), limit (1-20), filter (product name/supplier name/category)
3. Return JSON format: { "intent": "query_type", "parameters": { "time_period": "month", "limit": 5, "filter": null }, "confidence": 0.95 }
4. If you cannot identify a valid intent, respond with: { "intent": "unknown", "message": "I can help with sales analytics, inventory levels, or supplier performance. What would you like to know?" }
5. IMPORTANT: Never make up data. Only return valid intents from the list above.
6. Be concise and focus on data extraction.

Response Format (ALWAYS return valid JSON):
{
  "intent": "intent_name" | "unknown",
  "parameters": {
    "time_period": "today" | "week" | "month" | "year" | null,
    "limit": number | null,
    "filter": "string" | null
  },
  "confidence": 0.0 to 1.0,
  "message": "User-friendly explanation if needed"
}`;

/**
 * Process user query through Gemini and execute corresponding analytics query
 */
async function processUserQuery(userMessage, userId) {
  try {
    // Step 1: Extract intent from user message using Gemini
    const intentResponse = await extractIntent(userMessage);

    if (intentResponse.intent === "unknown") {
      return {
        response: intentResponse.message,
        type: "text",
        data: null,
      };
    }

    // Step 2: Execute analytics query based on intent
    const result = await executeAnalyticsQuery(intentResponse);

    if (!result.success) {
      return {
        response: `I couldn't retrieve that information. ${result.error || "Please try a different query."}`,
        type: "text",
        data: null,
      };
    }

    // Step 3: Format response using Gemini
    const formattedResponse = await formatResponse(
      userMessage,
      result.data,
      intentResponse
    );

    return {
      response: formattedResponse,
      type: result.responseType || "text",
      data: result.data,
      intent: intentResponse.intent,
    };
  } catch (error) {
    console.error("Chatbot Error:", error.message);
    return {
      response: "Sorry, I encountered an error processing your query. Please try again.",
      type: "text",
      data: null,
      error: error.message,
    };
  }
}

/**
 * Extract intent from user message using Gemini with multi-key fallback
 */
async function extractIntent(userMessage) {
  try {
    // First try: Use OpenRouter service
    const response = await llmService.generateText(
      `You are a chatbot for inventory management. Extract the intent from this message and respond ONLY with valid JSON.

Message: "${userMessage}"

Respond with ONLY this JSON (no other text):
{"intent": "intent_name", "parameters": {"time_period": "month", "limit": 5}, "confidence": 0.9}

Valid intents: top_products, revenue_trends, low_stock, inventory_summary, supplier_performance, sales_summary, unknown`,
      { temperature: 0.1 }
    );

    if (response.success) {
      const jsonMatch = response.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
      }
    }

    // If Gemini fails, fall back to pattern matching
    console.log("[Chatbot] Gemini extraction failed, using pattern matching fallback");
    return extractIntentFallback(userMessage);
  } catch (error) {
    console.error("Intent Extraction Error:", error.message);
    return extractIntentFallback(userMessage);
  }
}

/**
 * Fallback intent extraction using pattern matching (when Gemini fails)
 */
function extractIntentFallback(userMessage) {
  const msg = userMessage.toLowerCase();

  // Extract time period with numbers (e.g., "last 3 days", "past 7 days")
  let timePeriod = "month"; // default
  let days = null;

  const daysMatch = msg.match(/(?:last|past)\s+(\d+)\s+days?/);
  if (daysMatch) {
    days = parseInt(daysMatch[1]);
    timePeriod = `${days}days`;
  } else if (msg.includes("today")) {
    timePeriod = "today";
  } else if (msg.includes("week") || msg.includes("7 days")) {
    timePeriod = "week";
  } else if (msg.includes("month")) {
    timePeriod = "month";
  } else if (msg.includes("year")) {
    timePeriod = "year";
  }

  // ===== HEALTH CHECK & AVAILABILITY QUESTIONS =====
  if (msg.match(/what.*can.*help|what.*do|show.*options|available|help/) && !msg.includes("sale")) {
    return {
      intent: "get_help",
      parameters: { time_period: null, limit: null, filter: null },
      confidence: 0.95,
    };
  }

  // ===== YEAR-OVER-YEAR COMPARISON =====
  const yearMatch = msg.match(/(\d{4})/g);
  if ((msg.includes("why") || msg.includes("reason") || msg.includes("explain") || msg.includes("compare") || msg.includes("vs")) &&
      yearMatch && yearMatch.length >= 2) {
    const years = yearMatch.map(y => parseInt(y)).sort();
    return {
      intent: "year_comparison",
      parameters: { 
        year1: years[0], 
        year2: years[1], 
        filter: null 
      },
      confidence: 0.95,
    };
  }

  // ===== GENERAL REPORT & ANALYTICS QUESTIONS =====
  if ((msg.includes("report") || msg.includes("analytics") || msg.includes("analysis")) &&
      (msg.includes("business") || msg.includes("sales") || msg.includes("inventory") || msg.includes("summary"))) {
    return {
      intent: "business_report",
      parameters: { time_period: timePeriod, limit: null, filter: null },
      confidence: 0.95,
    };
  }

  // ===== KPI & METRICS QUESTIONS =====
  if ((msg.includes("kpi") || msg.includes("metric") || msg.includes("performance") || msg.includes("key indicator")) &&
      !msg.includes("supplier")) {
    return {
      intent: "kpi_metrics",
      parameters: { time_period: timePeriod, limit: null, filter: null },
      confidence: 0.9,
    };
  }

  // ===== PROFITABILITY ANALYSIS =====
  if ((msg.includes("profitable") || msg.includes("profitability") || msg.includes("margin") || 
       msg.includes("profit") || msg.includes("earnings")) && !msg.includes("product margin")) {
    if (msg.includes("product")) {
      return {
        intent: "product_profitability",
        parameters: { time_period: timePeriod, limit: 10, filter: null },
        confidence: 0.95,
      };
    }
    return {
      intent: "profitability_analysis",
      parameters: { time_period: timePeriod, limit: null, filter: null },
      confidence: 0.9,
    };
  }

  // ===== BEST SELLERS & PRODUCT ANALYSIS =====
  if ((msg.includes("best") || msg.includes("top") || msg.includes("leading") || msg.includes("fastest")) &&
      (msg.includes("product") || msg.includes("selling") || msg.includes("sale") || msg.includes("revenue") ||
       msg.includes("item") || msg.includes("sku"))) {
    const limitMatch = msg.match(/top\s+(\d+)|(\d+)\s+product/);
    const limit = limitMatch ? parseInt(limitMatch[1] || limitMatch[2]) : 5;

    return {
      intent: "top_products",
      parameters: { time_period: timePeriod, limit: limit, filter: null },
      confidence: 0.95,
    };
  }

  // ===== WORST SELLERS & LOW PERFORMING PRODUCTS =====
  if ((msg.includes("worst") || msg.includes("bottom") || msg.includes("slow") || msg.includes("poor")) &&
      (msg.includes("product") || msg.includes("selling") || msg.includes("sale") || msg.includes("revenue"))) {
    return {
      intent: "worst_products",
      parameters: { time_period: timePeriod, limit: 5, filter: null },
      confidence: 0.9,
    };
  }

  // ===== STOCK & INVENTORY QUESTIONS =====
  if ((msg.includes("stock") || msg.includes("inventory") || msg.includes("warehouse")) &&
      (msg.includes("level") || msg.includes("quantity") || msg.includes("available") || 
       msg.includes("storage") || msg.includes("location"))) {
    if (msg.includes("low") || msg.includes("alert") || msg.includes("warning")) {
      return {
        intent: "low_stock",
        parameters: { time_period: null, limit: null, filter: null },
        confidence: 0.95,
      };
    }
    return {
      intent: "inventory_status",
      parameters: { time_period: null, limit: null, filter: null },
      confidence: 0.9,
    };
  }

  // ===== STOCK VALUE & INVENTORY WORTH =====
  if ((msg.includes("stock") || msg.includes("inventory")) &&
      (msg.includes("value") || msg.includes("worth") || msg.includes("total") || 
       msg.includes("cost") || msg.includes("amount"))) {
    return {
      intent: "inventory_value",
      parameters: { time_period: null, limit: null, filter: null },
      confidence: 0.95,
    };
  }

  // ===== EXPIRY & AGING STOCK =====
  if ((msg.includes("expir") || msg.includes("old") || msg.includes("aging") || 
       msg.includes("outdated") || msg.includes("stale")) && 
      (msg.includes("stock") || msg.includes("product") || msg.includes("inventory"))) {
    return {
      intent: "aging_analysis",
      parameters: { time_period: null, limit: null, filter: null },
      confidence: 0.9,
    };
  }

  // ===== TREND ANALYSIS & INSIGHTS =====
  if ((msg.includes("why") || msg.includes("reason") || msg.includes("explain") || msg.includes("trend")) &&
      (msg.includes("sales") || msg.includes("revenue") || msg.includes("trend") || 
       msg.includes("higher") || msg.includes("lower") || msg.includes("increase") || 
       msg.includes("decrease") || msg.includes("spike") || msg.includes("dip"))) {
    return {
      intent: "trend_insights",
      parameters: { time_period: timePeriod, limit: null, filter: null },
      confidence: 0.9,
    };
  }

  // ===== REVENUE & SALES TRENDS =====
  if ((msg.includes("revenue") || msg.includes("trend") || msg.includes("sales trend") ||
       msg.includes("sales history") || msg.includes("revenue history")) &&
      (msg.includes("trend") || msg.includes("last") || msg.includes("past") ||
       msg.includes("day") || msg.includes("week") || msg.includes("month"))) {
    return {
      intent: "revenue_trends",
      parameters: { time_period: timePeriod, limit: null, filter: null },
      confidence: 0.95,
    };
  }

  // ===== SALES SUMMARY & TOTALS =====
  if ((msg.includes("total") || msg.includes("summary") || msg.includes("how much") ||
       msg.includes("overall") || msg.includes("aggregate")) &&
      (msg.includes("sales") || msg.includes("order") || msg.includes("revenue") ||
       msg.includes("sold") || msg.includes("transaction"))) {
    return {
      intent: "sales_summary",
      parameters: { time_period: timePeriod, limit: null, filter: null },
      confidence: 0.95,
    };
  }

  // ===== SALES BY CATEGORY =====
  if ((msg.includes("category") || msg.includes("product category") || msg.includes("by category")) &&
      (msg.includes("sales") || msg.includes("revenue") || msg.includes("performance") || 
       msg.includes("sale") || msg.includes("sold"))) {
    return {
      intent: "sales_by_category",
      parameters: { time_period: timePeriod, limit: null, filter: null },
      confidence: 0.9,
    };
  }

  // ===== SUPPLIER PERFORMANCE & RELIABILITY =====
  if ((msg.includes("supplier") || msg.includes("vendor")) &&
      (msg.includes("performance") || msg.includes("best") || msg.includes("reliable") ||
       msg.includes("metric") || msg.includes("pending order") || msg.includes("highest") ||
       msg.includes("rating") || msg.includes("score") || msg.includes("quality"))) {
    return {
      intent: "supplier_performance",
      parameters: { time_period: null, limit: null, filter: null },
      confidence: 0.95,
    };
  }

  // ===== SUPPLIER PAYMENT & BALANCE =====
  if ((msg.includes("supplier") || msg.includes("payment") || msg.includes("balance")) &&
      (msg.includes("pending") || msg.includes("payment") || msg.includes("balance") ||
       msg.includes("due") || msg.includes("owe") || msg.includes("outstanding") ||
       msg.includes("paid") || msg.includes("debt"))) {
    return {
      intent: "supplier_balance",
      parameters: { time_period: null, limit: null, filter: null },
      confidence: 0.95,
    };
  }

  // ===== PURCHASE ORDERS & PENDING ORDERS =====
  if ((msg.includes("purchase") || msg.includes("order") || msg.includes("po")) &&
      (msg.includes("pending") || msg.includes("status") || msg.includes("outstanding") ||
       msg.includes("progress") || msg.includes("in transit") || msg.includes("not received"))) {
    return {
      intent: "pending_orders",
      parameters: { time_period: null, limit: null, filter: null },
      confidence: 0.9,
    };
  }

  // ===== INVENTORY TURNOVER & MOVEMENT =====
  if ((msg.includes("turnover") || msg.includes("movement") || msg.includes("velocity") ||
       msg.includes("rotation") || msg.includes("turnover rate")) && 
      (msg.includes("inventory") || msg.includes("product") || msg.includes("stock"))) {
    return {
      intent: "inventory_turnover",
      parameters: { time_period: timePeriod, limit: null, filter: null },
      confidence: 0.95,
    };
  }

  // ===== CUSTOMER INSIGHTS =====
  if ((msg.includes("customer") || msg.includes("client") || msg.includes("buyer")) &&
      (msg.includes("analysis") || msg.includes("top") || msg.includes("frequent") ||
       msg.includes("best") || msg.includes("high value"))) {
    return {
      intent: "customer_analysis",
      parameters: { time_period: timePeriod, limit: 10, filter: null },
      confidence: 0.9,
    };
  }

  // ===== FORECASTING & PREDICTIONS =====
  if ((msg.includes("forecast") || msg.includes("predict") || msg.includes("projection") ||
       msg.includes("expected") || msg.includes("anticipated") || msg.includes("estimate")) &&
      (msg.includes("sales") || msg.includes("revenue") || msg.includes("demand") ||
       msg.includes("trend"))) {
    return {
      intent: "forecast",
      parameters: { time_period: timePeriod, limit: null, filter: null },
      confidence: 0.85,
    };
  }

  // ===== SEASONAL & MONTHLY ANALYSIS =====
  if ((msg.includes("season") || msg.includes("monthly") || msg.includes("quarterly") ||
       msg.includes("month") || msg.includes("q1") || msg.includes("q2") || 
       msg.includes("q3") || msg.includes("q4")) && 
      (msg.includes("comparison") || msg.includes("trend") || msg.includes("performance"))) {
    return {
      intent: "seasonal_analysis",
      parameters: { time_period: timePeriod, limit: null, filter: null },
      confidence: 0.9,
    };
  }

  // ===== DISCOUNT & PROMOTION IMPACT =====
  if ((msg.includes("discount") || msg.includes("promotion") || msg.includes("offer") ||
       msg.includes("sale") && msg.includes("price")) && 
      (msg.includes("impact") || msg.includes("effect") || msg.includes("result") || msg.includes("analysis"))) {
    return {
      intent: "promo_analysis",
      parameters: { time_period: timePeriod, limit: null, filter: null },
      confidence: 0.85,
    };
  }

  // ===== OUTLIERS & ANOMALIES =====
  if ((msg.includes("outlier") || msg.includes("anomaly") || msg.includes("unusual") ||
       msg.includes("unexpected") || msg.includes("strange")) && 
      (msg.includes("sales") || msg.includes("revenue") || msg.includes("order"))) {
    return {
      intent: "anomaly_detection",
      parameters: { time_period: timePeriod, limit: null, filter: null },
      confidence: 0.85,
    };
  }

  // ===== GENERAL SUMMARY & OVERVIEW =====
  if ((msg.includes("tell") && msg.includes("business")) || msg.includes("business overview") ||
      msg.includes("overview") || msg.includes("summary") || msg.includes("status")) {
    return {
      intent: "business_overview",
      parameters: { time_period: timePeriod, limit: null, filter: null },
      confidence: 0.9,
    };
  }

  // DEFAULT - unknown
  return {
    intent: "unknown",
    message: `I can help you with:\n\n📊 **Sales & Revenue**: trends, totals, top products, revenue analysis\n📦 **Inventory**: stock levels, low stock alerts, inventory value, turnover rates\n🤝 **Suppliers**: performance metrics, payment status, pending orders\n💰 **Profitability**: profit margins, earnings analysis, product profitability\n📈 **Analytics**: trends, forecasts, comparisons, seasonal analysis\n\nWhat would you like to know?`,
  };
}

/**
 * Execute analytics query based on intent - Direct DB queries
 */
async function executeAnalyticsQuery(intentData) {
  const { intent, parameters } = intentData;

  try {
    let data = null;

    switch (intent) {
      // ===== EXISTING INTENTS =====
      case "get_help":
        return {
          success: true,
          data: {
            message: `🤖 **Smart Inventory Chatbot** - I can help with:\n\n📊 **Sales & Revenue Analysis**:\n • Top/Worst selling products\n • Revenue trends & patterns\n • Sales by category\n • Customer analysis\n\n📦 **Inventory Management**:\n • Stock levels & availability\n • Low stock alerts\n • Inventory value & worth\n • Aging/expiry analysis\n • Turnover rates\n\n🤝 **Supplier & Procurement**:\n • Supplier performance metrics\n • Payment & balance status\n • Pending purchase orders\n\n💰 **Business Insights**:\n • Profitability analysis\n • KPI & performance metrics\n • Year-over-year comparison\n • Seasonal analysis\n • Anomaly detection\n\n📈 **Advanced Analytics**:\n • Sales forecasting\n • Trend insights & explanations\n • Promotion impact analysis\n • Business overview & reports\n\n📌 **Try asking**: "Top 10 products?", "Low stock alert?", "Profitability analysis?", "Revenue trends last month?" etc.`
          },
          responseType: "text"
        };

      case "top_products":
        data = await getTopProducts(parameters.limit || 5, parameters.time_period || "month");
        break;

      case "worst_products":
        data = await getWorstProducts(parameters.limit || 5, parameters.time_period || "month");
        break;

      case "revenue_trends":
        data = await getRevenueTrends(parameters.time_period || "month");
        break;

      case "trend_insights":
        data = await getTrendInsights(parameters.time_period || "month");
        break;

      case "year_comparison":
        data = await getYearComparison(parameters.year1, parameters.year2);
        break;

      case "low_stock":
        data = await getLowStockItems();
        break;

      case "inventory_status":
        data = await getInventoryStatus();
        break;

      case "inventory_value":
        data = await getInventoryValue();
        break;

      case "inventory_summary":
        data = await getInventorySummary();
        break;

      case "aging_analysis":
        data = await getAgingAnalysis();
        break;

      case "inventory_turnover":
        data = await getInventoryTurnover(parameters.time_period || "month");
        break;

      case "supplier_balance":
        data = await getSupplierBalance();
        break;

      case "supplier_performance":
        data = await getSupplierPerformance();
        break;

      case "pending_orders":
        data = await getPendingOrders();
        break;

      case "sales_summary":
        data = await getSalesSummary(parameters.time_period || "month");
        break;

      case "sales_by_category":
        data = await getSalesByCategory(parameters.time_period || "month");
        break;

      case "profitability_analysis":
        data = await getProfitabilityAnalysis(parameters.time_period || "month");
        break;

      case "product_profitability":
        data = await getProductProfitability(parameters.limit || 10, parameters.time_period || "month");
        break;

      case "kpi_metrics":
        data = await getKPIMetrics(parameters.time_period || "month");
        break;

      case "customer_analysis":
        data = await getCustomerAnalysis(parameters.limit || 10, parameters.time_period || "month");
        break;

      case "business_report":
        data = await getBusinessReport(parameters.time_period || "month");
        break;

      case "business_overview":
        data = await getBusinessOverview(parameters.time_period || "month");
        break;

      case "forecast":
        data = await getForecast(parameters.time_period || "month");
        break;

      case "seasonal_analysis":
        data = await getSeasonalAnalysis();
        break;

      case "promo_analysis":
        data = await getPromoAnalysis();
        break;

      case "anomaly_detection":
        data = await getAnomalyDetection(parameters.time_period || "month");
        break;

      default:
        return {
          success: false,
          error: "Query type not recognized",
        };
    }

    // Determine response type based on data structure
    let responseType = "text";
    if (Array.isArray(data) && data.length > 0) {
      responseType = "table";
    } else if (data && typeof data === "object") {
      if (data.insight || data.message) {
        responseType = "text";
      } else if (data.chartData || data.labels) {
        responseType = "chart";
      }
    }

    return {
      success: true,
      data: data,
      responseType,
    };
  } catch (error) {
    console.error("Analytics Query Error:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get top products from database
 */
async function getTopProducts(limit = 5, timePeriod = "month") {
  try {
    const startDate = getStartDate(timePeriod);

    const topProducts = await SalesOrder.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: "COMPLETED"
        }
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product_id",
          product_name: { $first: "$items.product_name" },
          total_revenue: { $sum: { $multiply: ["$items.quantity", "$items.unit_price"] } },
          total_quantity: { $sum: "$items.quantity" },
          sales_count: { $sum: 1 }
        }
      },
      { $sort: { total_revenue: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          product_name: 1,
          total_revenue: { $round: ["$total_revenue", 2] },
          total_quantity: 1,
          sales_count: 1
        }
      }
    ]);

    return topProducts || [];
  } catch (error) {
    console.error("Error getting top products:", error.message);
    return [];
  }
}

/**
 * Get revenue trends
 */
async function getRevenueTrends(timePeriod = "month") {
  try {
    const startDate = getStartDate(timePeriod);

    const trends = await SalesOrder.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: "COMPLETED"
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          revenue: { $sum: "$total_amount" },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: "$_id",
          revenue: { $round: ["$revenue", 2] },
          orders: 1
        }
      }
    ]);

    return trends || [];
  } catch (error) {
    console.error("Error getting revenue trends:", error.message);
    return [];
  }
}

/**
 * Generate storytelling insights about sales trends
 */
async function getTrendInsights(timePeriod = "month") {
  try {
    const startDate = getStartDate(timePeriod);
    const endDate = new Date();

    // Get revenue trends data
    const trends = await SalesOrder.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: "COMPLETED"
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          revenue: { $sum: "$total_amount" },
          orders: { $sum: 1 },
          items_sold: { $sum: { $size: "$items" } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    if (!trends || trends.length === 0) {
      return {
        insight: "No sales data available for the selected period.",
        trends: [],
        summary: {}
      };
    }

    // Calculate metrics
    const revenues = trends.map(t => t.revenue);
    const orderCounts = trends.map(t => t.orders);
    
    const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;
    const maxRevenue = Math.max(...revenues);
    const minRevenue = Math.min(...revenues);
    const totalRevenue = revenues.reduce((a, b) => a + b, 0);
    const totalOrders = orderCounts.reduce((a, b) => a + b, 0);
    
    const peakDay = trends.find(t => t.revenue === maxRevenue);
    const lowDay = trends.find(t => t.revenue === minRevenue);

    // Generate insights based on patterns
    let insights = [];

    // Trend direction
    const firstHalf = revenues.slice(0, Math.floor(revenues.length / 2));
    const secondHalf = revenues.slice(Math.floor(revenues.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const trendDirection = secondAvg > firstAvg ? "upward" : "downward";
    const percentChange = Math.round(((secondAvg - firstAvg) / firstAvg) * 100);

    if (trendDirection === "upward") {
      insights.push(`📈 Sales show a strong ${percentChange}% upward trend. This suggests growing customer demand and successful sales momentum.`);
    } else {
      insights.push(`📉 Sales show a ${Math.abs(percentChange)}% downward trend. This could indicate seasonal factors, market conditions, or need for promotional activities.`);
    }

    // Peak analysis
    const daysAboveAvg = trends.filter(t => t.revenue > avgRevenue).length;
    insights.push(`🎯 Peak sales occurred on ${peakDay._id} with ₹${maxRevenue.toFixed(2)} revenue. You had ${daysAboveAvg} days above average performance.`);

    // Consistency analysis
    const variance = revenues.reduce((sum, val) => sum + Math.pow(val - avgRevenue, 2), 0) / revenues.length;
    const stdDev = Math.sqrt(variance);
    const cv = (stdDev / avgRevenue) * 100; // Coefficient of variation
    
    if (cv < 20) {
      insights.push(`✅ Sales are highly consistent with low variability, indicating stable customer demand.`);
    } else if (cv < 50) {
      insights.push(`⚠️ Sales show moderate fluctuation, suggesting some market volatility or seasonal patterns.`);
    } else {
      insights.push(`🔔 Sales are highly volatile with significant day-to-day variation. Consider investigating factors causing these fluctuations.`);
    }

    // Average daily performance
    insights.push(`📊 Average daily revenue: ₹${avgRevenue.toFixed(2)} | Average orders per day: ${(totalOrders / trends.length).toFixed(0)}`);

    return {
      insight: insights.join("\n\n"),
      trendDirection,
      percentChange,
      metrics: {
        totalRevenue: totalRevenue.toFixed(2),
        totalOrders,
        averageRevenue: avgRevenue.toFixed(2),
        peakRevenue: maxRevenue.toFixed(2),
        peakDate: peakDay._id,
        lowestRevenue: minRevenue.toFixed(2),
        lowestDate: lowDay._id,
        consistency: cv.toFixed(1)
      },
      trends: trends.map(t => ({
        date: t._id,
        revenue: t.revenue.toFixed(2),
        orders: t.orders,
        itemsSold: t.items_sold
      }))
    };

  } catch (error) {
    console.error("Error generating trend insights:", error.message);
    return {
      insight: "Unable to generate insights. Please try again.",
      trends: [],
      summary: {}
    };
  }
}

/**
 * Compare sales trends between two years
 */
async function getYearComparison(year1, year2) {
  try {
    // Helper function to get year data
    const getYearData = async (year) => {
      const startDate = new Date(year, 0, 1);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(year, 11, 31);
      endDate.setHours(23, 59, 59, 999);

      // Query both Sale and SalesOrder collections
      const [legacySales, completedOrders] = await Promise.all([
        Sale.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate, $lte: endDate }
            }
          },
          {
            $group: {
              _id: {
                month: { $month: "$createdAt" },
                monthName: {
                  $arrayElemAt: [
                    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                    { $subtract: [{ $month: "$createdAt" }, 1] }
                  ]
                }
              },
              revenue: { $sum: "$revenue" },
              orders: { $sum: 1 }
            }
          }
        ]),
        SalesOrder.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate, $lte: endDate },
              status: "COMPLETED"
            }
          },
          {
            $group: {
              _id: {
                month: { $month: "$createdAt" },
                monthName: {
                  $arrayElemAt: [
                    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                    { $subtract: [{ $month: "$createdAt" }, 1] }
                  ]
                }
              },
              revenue: { $sum: "$total_amount" },
              orders: { $sum: 1 }
            }
          }
        ])
      ]);

      // Merge results by month
      const mergedData = {};
      
      legacySales.forEach(item => {
        const key = item._id.month;
        if (!mergedData[key]) {
          mergedData[key] = { ...item };
        } else {
          mergedData[key].revenue += item.revenue;
          mergedData[key].orders += item.orders;
        }
      });

      completedOrders.forEach(item => {
        const key = item._id.month;
        if (!mergedData[key]) {
          mergedData[key] = { ...item };
        } else {
          mergedData[key].revenue += item.revenue;
          mergedData[key].orders += item.orders;
        }
      });

      // Convert to array and sort by month
      const yearData = Object.values(mergedData).sort((a, b) => a._id.month - b._id.month);
      return yearData;
    };

    const data1 = await getYearData(year1);
    const data2 = await getYearData(year2);

    // Check if we have data for both years
    if (data1.length === 0 || data2.length === 0) {
      return {
        insight: `Unable to find sales data for the selected years. Available data: ${year1} (${data1.length} months), ${year2} (${data2.length} months). Please check if transactions exist for these periods.`,
        metrics: {}
      };
    }

    // Calculate annual totals
    const total1 = data1.reduce((sum, m) => sum + m.revenue, 0);
    const total2 = data2.reduce((sum, m) => sum + m.revenue, 0);
    const orders1 = data1.reduce((sum, m) => sum + m.orders, 0);
    const orders2 = data2.reduce((sum, m) => sum + m.orders, 0);

    // Determine which year is higher
    const higherYear = total1 > total2 ? year1 : year2;
    const lowerYear = total1 > total2 ? year2 : year1;
    const higherTotal = Math.max(total1, total2);
    const lowerTotal = Math.min(total1, total2);
    const percentDifference = lowerTotal > 0 ? Math.round(((higherTotal - lowerTotal) / lowerTotal) * 100) : 0;

    // Find peak months for each year
    const peak1 = data1.length > 0 ? data1.reduce((max, m) => m.revenue > max.revenue ? m : max, data1[0]) : null;
    const peak2 = data2.length > 0 ? data2.reduce((max, m) => m.revenue > max.revenue ? m : max, data2[0]) : null;

    // Generate storytelling insights with professional formatting
    let insights = [];

    insights.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    insights.push(`📊 YEAR-OVER-YEAR COMPARISON: ${year1} vs ${year2}`);
    insights.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Revenue Section
    insights.push(`💰 ANNUAL REVENUE ANALYSIS`);
    insights.push(`├─ ${year1}: ₹${total1.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
    insights.push(`├─ ${year2}: ₹${total2.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
    insights.push(`├─ Difference: ₹${Math.abs(higherTotal - lowerTotal).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
    insights.push(`└─ ${higherYear} is ${percentDifference}% HIGHER\n`);

    // Reasons Section
    insights.push(`🎯 WHY ${higherYear} PERFORMED BETTER\n`);

    if (percentDifference > 50) {
      insights.push(`🔥 1. SIGNIFICANT MARKET GROWTH`);
      insights.push(`   └─ ${percentDifference}% surge indicates strong business expansion`);
      insights.push(`      and increased market demand\n`);
    } else if (percentDifference > 20) {
      insights.push(`📈 1. SUBSTANTIAL GROWTH`);
      insights.push(`   └─ ${percentDifference}% improvement shows successful sales`);
      insights.push(`      strategy and market expansion\n`);
    } else if (percentDifference > 0) {
      insights.push(`✅ 1. STEADY GROWTH`);
      insights.push(`   └─ Moderate ${percentDifference}% improvement demonstrates`);
      insights.push(`      consistent business performance\n`);
    } else {
      insights.push(`⚠️  1. MARKET CONDITIONS`);
      insights.push(`   └─ Lower sales may result from economic factors,`);
      insights.push(`      competition, or seasonal variations\n`);
    }

    if (peak1 && peak2) {
      insights.push(`🗓️  2. SEASONALITY IMPACT`);
      insights.push(`   ├─ Peak in ${peak1._id.monthName} (${year1}): ₹${peak1.revenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
      insights.push(`   └─ Peak in ${peak2._id.monthName} (${year2}): ₹${peak2.revenue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}\n`);
    }
    
    insights.push(`🛍️  3. PRODUCT MIX CHANGES`);
    insights.push(`   └─ Different product popularity or pricing strategies\n`);
    
    insights.push(`👥 4. CUSTOMER ACQUISITION`);
    insights.push(`   └─ Growth in customer base or increased order frequency\n`);

    // Volume Metrics Section
    insights.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    insights.push(`📈 PERFORMANCE METRICS\n`);
    insights.push(`📦 Order Volume:`);
    insights.push(`├─ ${year1}: ${orders1.toLocaleString('en-IN')} orders`);
    insights.push(`└─ ${year2}: ${orders2.toLocaleString('en-IN')} orders\n`);
    
    insights.push(`💵 Average Order Value:`);
    insights.push(`├─ ${year1}: ₹${(orders1 > 0 ? (total1 / orders1).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '0')}`);
    insights.push(`└─ ${year2}: ₹${(orders2 > 0 ? (total2 / orders2).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '0')}\n`);

    insights.push(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    return {
      insight: insights.join("\n"),
      year1,
      year2,
      higherYear,
      percentDifference,
      metrics: {
        year1_revenue: total1.toFixed(2),
        year2_revenue: total2.toFixed(2),
        year1_orders: orders1,
        year2_orders: orders2,
        peak_month_year1: peak1._id?.monthName || "N/A",
        peak_month_year2: peak2._id?.monthName || "N/A"
      },
      monthlyData: {
        [year1]: data1,
        [year2]: data2
      }
    };

  } catch (error) {
    console.error("Error comparing years:", error.message);
    return {
      insight: `Unable to compare ${year1} and ${year2}. Please check if data exists for both years.`,
      metrics: {}
    };
  }
}

/**
 * Get low stock items
 */
async function getLowStockItems() {
  try {
    const lowStockItems = await Product.find({
      $expr: { $lt: ["$current_stock", "$reorder_point"] }
    }).limit(20).select({
      name: 1,
      current_stock: 1,
      reorder_point: 1,
      reorder_quantity: 1,
      category: 1
    });

    return lowStockItems.map(item => ({
      product_name: item.name,
      current_stock: item.current_stock,
      reorder_point: item.reorder_point,
      reorder_quantity: item.reorder_quantity,
      category: item.category
    })) || [];
  } catch (error) {
    console.error("Error getting low stock items:", error.message);
    return [];
  }
}

/**
 * Get inventory summary
 */
async function getInventorySummary() {
  try {
    const products = await Product.find({});

    let totalValue = 0;
    let totalItems = 0;
    let lowStockCount = 0;

    products.forEach(product => {
      totalValue += (product.cost_price || 0) * (product.current_stock || 0);
      totalItems += product.current_stock || 0;
      if ((product.current_stock || 0) < (product.reorder_point || 0)) {
        lowStockCount += 1;
      }
    });

    return {
      total_inventory_value: totalValue.toFixed(2),
      total_items_in_stock: totalItems,
      total_products: products.length,
      low_stock_items: lowStockCount
    };
  } catch (error) {
    console.error("Error getting inventory summary:", error.message);
    return {};
  }
}

/**
 * Get supplier performance
 */
async function getSupplierPerformance() {
  try {
    const suppliers = await Supplier.find({}).lean();

    const performance = await Promise.all(suppliers.map(async (supplier) => {
      try {
        const supplierId = supplier._id.toString ? supplier._id.toString() : supplier._id;

        const totalOrders = await PurchaseOrder.countDocuments({
          supplier_id: { $in: [supplier._id, supplierId] }
        });

        const completedOrders = await PurchaseOrder.countDocuments({
          supplier_id: { $in: [supplier._id, supplierId] },
          status: "DELIVERED"
        });

        const pendingOrders = await PurchaseOrder.countDocuments({
          supplier_id: { $in: [supplier._id, supplierId] },
          status: { $in: ["PENDING", "ORDERED"] }
        });

        const totalSpent = await PurchaseOrder.aggregate([
          { $match: { supplier_id: supplier._id } },
          { $group: { _id: null, total: { $sum: "$total_amount" } } }
        ]);

        const onTimeRate = totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(1) : 0;

        return {
          supplier_name: supplier.name,
          total_orders: totalOrders,
          completed_orders: completedOrders,
          pending_orders: pendingOrders,
          total_spent: (totalSpent[0]?.total || 0).toFixed(2),
          on_time_rate: `${onTimeRate}%`
        };
      } catch (err) {
        console.error(`Error processing supplier ${supplier.name}:`, err.message);
        return null;
      }
    }));

    // Filter out nulls and sort by pending orders (descending)
    const filtered = performance.filter(p => p !== null)
      .sort((a, b) => b.pending_orders - a.pending_orders);

    return filtered || [];
  } catch (error) {
    console.error("Error getting supplier performance:", error.message);
    return [];
  }
}

/**
 * Get supplier balance (pending payments)
 */
async function getSupplierBalance() {
  try {
    const suppliers = await Supplier.find({
      balance_due: { $gt: 0 }
    }).select({
      name: 1,
      balance_due: 1,
      total_paid: 1,
      phone: 1,
      email: 1
    }).lean();

    return suppliers.map(supplier => ({
      supplier_name: supplier.name,
      balance_due: parseFloat(supplier.balance_due || 0).toFixed(2),
      total_paid: parseFloat(supplier.total_paid || 0).toFixed(2),
      contact: supplier.phone || supplier.email || 'N/A'
    })) || [];
  } catch (error) {
    console.error("Error getting supplier balance:", error.message);
    return [];
  }
}

/**
 * Get sales summary
 */
async function getSalesSummary(timePeriod = "month") {
  try {
    const startDate = getStartDate(timePeriod);

    const totalOrders = await SalesOrder.countDocuments({
      createdAt: { $gte: startDate },
      status: "COMPLETED"
    });

    const orderData = await SalesOrder.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: "COMPLETED"
        }
      },
      {
        $group: {
          _id: null,
          total_revenue: { $sum: "$total_amount" },
          total_quantity: { $sum: { $sum: "$items.quantity" } }
        }
      }
    ]);

    return {
      total_orders: totalOrders,
      total_revenue: (orderData[0]?.total_revenue || 0).toFixed(2),
      total_quantity_sold: orderData[0]?.total_quantity || 0,
      average_order_value: orderData[0] ? ((orderData[0].total_revenue / totalOrders) || 0).toFixed(2) : 0
    };
  } catch (error) {
    console.error("Error getting sales summary:", error.message);
    return {};
  }
}

/**
 * Get worst performing products
 */
async function getWorstProducts(limit = 5, timePeriod = "month") {
  try {
    const startDate = getStartDate(timePeriod);

    const worstProducts = await SalesOrder.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: "COMPLETED"
        }
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product_id",
          product_name: { $first: "$items.product_name" },
          total_revenue: { $sum: { $multiply: ["$items.quantity", "$items.unit_price"] } },
          total_quantity: { $sum: "$items.quantity" },
          sales_count: { $sum: 1 }
        }
      },
      { $sort: { total_revenue: 1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          product_name: 1,
          total_revenue: { $round: ["$total_revenue", 2] },
          total_quantity: 1,
          sales_count: 1
        }
      }
    ]);

    return worstProducts || [];
  } catch (error) {
    console.error("Error getting worst products:", error.message);
    return [];
  }
}

/**
 * Get inventory status
 */
async function getInventoryStatus() {
  try {
    const products = await Product.find({}).select("name current_stock reorder_point category");
    
    return products.map(p => ({
      product_name: p.name,
      current_stock: p.current_stock,
      reorder_point: p.reorder_point,
      status: p.current_stock <= p.reorder_point ? "LOW" : "OK",
      category: p.category
    })) || [];
  } catch (error) {
    console.error("Error getting inventory status:", error.message);
    return [];
  }
}

/**
 * Get inventory value
 */
async function getInventoryValue() {
  try {
    const inventoryData = await Product.aggregate([
      {
        $group: {
          _id: null,
          total_value: { $sum: { $multiply: ["$cost_price", "$current_stock"] } },
          total_items: { $sum: "$current_stock" },
          total_products: { $sum: 1 }
        }
      }
    ]);

    const data = inventoryData[0] || { total_value: 0, total_items: 0, total_products: 0 };
    
    return {
      insight: `📦 **Inventory Valuation**: Your total inventory is valued at ₹${parseFloat(data.total_value || 0).toFixed(2)} with ${data.total_items} items across ${data.total_products} products.`,
      total_inventory_value: parseFloat(data.total_value || 0).toFixed(2),
      total_items: data.total_items,
      product_count: data.total_products
    };
  } catch (error) {
    console.error("Error getting inventory value:", error.message);
    return {};
  }
}

/**
 * Get aging analysis (old stocks)
 */
async function getAgingAnalysis() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const agingProducts = await Product.find({
      updated_at: { $lt: thirtyDaysAgo },
      current_stock: { $gt: 0 }
    }).select("name current_stock updated_at category");

    return agingProducts.map(p => ({
      product_name: p.name,
      stock_qty: p.current_stock,
      days_old: Math.floor((Date.now() - p.updated_at) / (1000 * 60 * 60 * 24)),
      category: p.category
    })) || [];
  } catch (error) {
    console.error("Error getting aging analysis:", error.message);
    return [];
  }
}

/**
 * Get inventory turnover
 */
async function getInventoryTurnover(timePeriod = "month") {
  try {
    const startDate = getStartDate(timePeriod);

    const turnoverData = await SalesOrder.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: "COMPLETED"
        }
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product_id",
          product_name: { $first: "$items.product_name" },
          units_sold: { $sum: "$items.quantity" },
          turnover_times: { $sum: 1 }
        }
      },
      { $sort: { units_sold: -1 } },
      { $limit: 10 }
    ]);

    return turnoverData.map(t => ({
      product_name: t.product_name,
      units_sold: t.units_sold,
      transactions: t.turnover_times
    })) || [];
  } catch (error) {
    console.error("Error getting inventory turnover:", error.message);
    return [];
  }
}

/**
 * Get pending purchase orders
 */
async function getPendingOrders() {
  try {
    const pendingOrders = await PurchaseOrder.find({
      status: { $in: ["PENDING", "ORDERED"] }
    }).select("supplier_id product_id quantity status created_at")
      .populate("supplier_id", "name")
      .limit(20);

    return pendingOrders.map(order => ({
      supplier_name: order.supplier_id?.name || "Unknown",
      status: order.status,
      quantity: order.quantity,
      ordered_date: order.created_at
    })) || [];
  } catch (error) {
    console.error("Error getting pending orders:", error.message);
    return [];
  }
}

/**
 * Get sales by category
 */
async function getSalesByCategory(timePeriod = "month") {
  try {
    const startDate = getStartDate(timePeriod);

    const categorySales = await SalesOrder.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: "COMPLETED"
        }
      },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product_id",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      {
        $group: {
          _id: "$product.category",
          total_revenue: { $sum: { $multiply: ["$items.quantity", "$items.unit_price"] } },
          total_quantity: { $sum: "$items.quantity" },
          sales_count: { $sum: 1 }
        }
      },
      { $sort: { total_revenue: -1 } }
    ]);

    return categorySales.map(cat => ({
      category: cat._id || "Uncategorized",
      revenue: parseFloat(cat.total_revenue).toFixed(2),
      quantity: cat.total_quantity,
      transactions: cat.sales_count
    })) || [];
  } catch (error) {
    console.error("Error getting sales by category:", error.message);
    return [];
  }
}

/**
 * Get profitability analysis
 */
async function getProfitabilityAnalysis(timePeriod = "month") {
  try {
    const startDate = getStartDate(timePeriod);

    const profitData = await SalesOrder.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: "COMPLETED"
        }
      },
      {
        $group: {
          _id: null,
          total_revenue: { $sum: "$total_amount" },
          total_profit: { $sum: { $subtract: ["$total_amount", "$total_cost"] } }
        }
      }
    ]);

    const data = profitData[0] || { total_revenue: 0, total_profit: 0 };
    const revenue = parseFloat(data.total_revenue || 0);
    const profit = parseFloat(data.total_profit || 0);
    const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(2) : 0;

    return {
      insight: `💰 **Profitability Report**: Total profit of ₹${profit.toFixed(2)} from ₹${revenue.toFixed(2)} revenue with ${margin}% profit margin.`,
      total_revenue: revenue.toFixed(2),
      total_profit: profit.toFixed(2),
      profit_margin: margin
    };
  } catch (error) {
    console.error("Error getting profitability analysis:", error.message);
    return {};
  }
}

/**
 * Get product profitability
 */
async function getProductProfitability(limit = 10, timePeriod = "month") {
  try {
    const startDate = getStartDate(timePeriod);

    const profitableProducts = await SalesOrder.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: "COMPLETED"
        }
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product_id",
          product_name: { $first: "$items.product_name" },
          total_revenue: { $sum: { $multiply: ["$items.quantity", "$items.unit_price"] } },
          total_cost: { $sum: { $multiply: ["$items.quantity", "$items.cost_price"] } }
        }
      },
      {
        $addFields: {
          profit: { $subtract: ["$total_revenue", "$total_cost"] },
          margin: {
            $cond: [
              { $gt: ["$total_revenue", 0] },
              { $multiply: [{ $divide: [{ $subtract: ["$total_revenue", "$total_cost"] }, "$total_revenue"] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { profit: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          product_name: 1,
          revenue: { $round: ["$total_revenue", 2] },
          profit: { $round: ["$profit", 2] },
          margin: { $round: ["$margin", 2] }
        }
      }
    ]);

    return profitableProducts || [];
  } catch (error) {
    console.error("Error getting product profitability:", error.message);
    return [];
  }
}

/**
 * Get KPI metrics
 */
async function getKPIMetrics(timePeriod = "month") {
  try {
    const startDate = getStartDate(timePeriod);

    const [salesData, invData, supplierData] = await Promise.all([
      SalesOrder.aggregate([
        { $match: { createdAt: { $gte: startDate }, status: "COMPLETED" } },
        { $group: { _id: null, total_revenue: { $sum: "$total_amount" }, order_count: { $sum: 1 } } }
      ]),
      Product.aggregate([
        { $group: { _id: null, total_value: { $sum: { $multiply: ["$cost_price", "$current_stock"] } }, total_items: { $sum: "$current_stock" } } }
      ]),
      Supplier.countDocuments({})
    ]);

    const sales = salesData[0] || { total_revenue: 0, order_count: 0 };
    const inv = invData[0] || { total_value: 0, total_items: 0 };

    return {
      kpis: [
        { metric: "Total Revenue", value: `₹${parseFloat(sales.total_revenue).toFixed(2)}`, icon: "💰" },
        { metric: "Orders", value: sales.order_count, icon: "📦" },
        { metric: "Inventory Value", value: `₹${parseFloat(inv.total_value).toFixed(2)}`, icon: "📊" },
        { metric: "Stock Items", value: inv.total_items, icon: "📈" },
        { metric: "Active Suppliers", value: supplierData, icon: "🤝" }
      ]
    };
  } catch (error) {
    console.error("Error getting KPI metrics:", error.message);
    return { kpis: [] };
  }
}

/**
 * Get customer analysis
 */
async function getCustomerAnalysis(limit = 10, timePeriod = "month") {
  try {
    const startDate = getStartDate(timePeriod);

    const topCustomers = await SalesOrder.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: "COMPLETED"
        }
      },
      {
        $group: {
          _id: "$customer_id",
          customer_name: { $first: "$customer_name" },
          total_spent: { $sum: "$total_amount" },
          order_count: { $sum: 1 }
        }
      },
      { $sort: { total_spent: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          customer_name: 1,
          purchases: "$order_count",
          revenue: { $round: ["$total_spent", 2] }
        }
      }
    ]);

    return topCustomers || [];
  } catch (error) {
    console.error("Error getting customer analysis:",error.message);
    return [];
  }
}

/**
 * Get business report
 */
async function getBusinessReport(timePeriod = "month") {
  try {
    const startDate = getStartDate(timePeriod);
    const [sales, inv, suppliers] = await Promise.all([
      getSalesSummary(timePeriod),
      getInventorySummary(),
      getSupplierPerformance()
    ]);

    return {
      insight: `📊 **Business Report**:\n\n💰 Sales: ₹${sales.total_revenue} (${sales.total_orders} orders)\n📦 Inventory: ₹${inv.total_inventory_value} value\n🤝 Suppliers: ${suppliers.length} active`,
      sales_summary: sales,
      inventory_summary: inv,
      supplier_count: suppliers.length
    };
  } catch (error) {
    console.error("Error generating business report:", error.message);
    return {};
  }
}

/**
 * Get business overview
 */
async function getBusinessOverview(timePeriod = "month") {
  try {
    return await getBusinessReport(timePeriod);
  } catch (error) {
    console.error("Error getting business overview:", error.message);
    return {};
  }
}

/**
 * Get forecast (simple trend-based forecast)
 */
async function getForecast(timePeriod = "month") {
  try {
    const startDate = getStartDate(timePeriod);
    const trends = await getRevenueTrends(timePeriod);

    if (!trends || trends.length < 2) {
      return { insight: "Not enough data for forecasting. Please try again later." };
    }

    const values = trends.map(t => parseFloat(t.revenue));
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    return {
      insight: `📈 **Sales Forecast**: Based on recent trends, expect average daily revenue of ₹${avg.toFixed(2)}. Actual results may vary based on market conditions.`,
      forecasted_revenue: avg.toFixed(2),
      confidence: "65%"
    };
  } catch (error) {
    console.error("Error generating forecast:", error.message);
    return {};
  }
}

/**
 * Get seasonal analysis
 */
async function getSeasonalAnalysis() {
  try {
    const last12Months = new Date();
    last12Months.setMonth(last12Months.getMonth() - 12);

    const monthlyData = await SalesOrder.aggregate([
      {
        $match: {
          createdAt: { $gte: last12Months },
          status: "COMPLETED"
        }
      },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            monthName: {
              $arrayElemAt: [
                ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                { $subtract: [{ $month: "$createdAt" }, 1] }
              ]
            }
          },
          revenue: { $sum: "$total_amount" }
        }
      },
      { $sort: { "_id.month": 1 } }
    ]);

    return {
      insight: `🗓️ **Seasonal Trends**: Analysis shows monthly performance variations across the year.`,
      monthly_data: monthlyData.map(m => ({
        month: m._id.monthName,
        revenue: parseFloat(m.revenue).toFixed(2)
      }))
    };
  } catch (error) {
    console.error("Error getting seasonal analysis:", error.message);
    return {};
  }
}

/**
 * Get promotion analysis
 */
async function getPromoAnalysis() {
  try {
    // Check if there's a discount_percentage or promotion field in orders
    const promoData = await SalesOrder.aggregate([
      {
        $match: {
          status: "COMPLETED",
          discount_percentage: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: "$discount_percentage",
          count: { $sum: 1 },
          avg_revenue: { $avg: "$total_amount" }
        }
      }
    ]);

    if (promoData.length === 0) {
      return { insight: "No promotion data available for analysis." };
    }

    return {
      insight: `💳 **Promotion Impact**: Different discounts show varying customer response rates.`,
      promo_data: promoData.map(p => ({
        discount_percent: `${p._id}%`,
        orders: p.count,
        avg_order_value: parseFloat(p.avg_revenue).toFixed(2)
      }))
    };
  } catch (error) {
    console.error("Error getting promotion analysis:", error.message);
    return {};
  }
}

/**
 * Detect anomalies in sales
 */
async function getAnomalyDetection(timePeriod = "month") {
  try {
    const startDate = getStartDate(timePeriod);
    const trends = await getRevenueTrends(timePeriod);

    if (!trends || trends.length < 3) {
      return { insight: "Not enough data for anomaly detection." };
    }

    const revenues = trends.map(t => parseFloat(t.revenue));
    const mean = revenues.reduce((a, b) => a + b, 0) / revenues.length;
    const variance = revenues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / revenues.length;
    const stdDev = Math.sqrt(variance);

    const anomalies = trends.filter((t, i) => {
      const zScore = Math.abs((revenues[i] - mean) / stdDev);
      return zScore > 2;
    });

    return {
      insight: `⚠️ **Anomaly Detection**: Found ${anomalies.length} unusual sales days out of ${trends.length}.`,
      anomalies: anomalies.map(a => ({
        date: a.date,
        revenue: a.revenue,
        deviation: "High"
      }))
    };
  } catch (error) {
    console.error("Error detecting anomalies:", error.message);
    return {};
  }
}

/**
 * Format response using simple templates (no Gemini)
 */
async function formatResponse(userMessage, data, intentData) {
  try {
    // If data already has an insight, return it
    if (data.insight) {
      return data.insight;
    }

    if (data.message) {
      return data.message;
    }

    // For arrays, create a formatted table response
    if (Array.isArray(data) && data.length > 0) {
      let response = `📊 ${intentData.intent.replace(/_/g, " ").toUpperCase()}\n\n`;
      response += "Here's what I found:\n\n";
      
      for (let i = 0; i < Math.min(5, data.length); i++) {
        const item = data[i];
        if (typeof item === 'object') {
          response += `${i + 1}. ${Object.values(item).join(' | ')}\n`;
        } else {
          response += `${i + 1}. ${item}\n`;
        }
      }
      
      if (data.length > 5) {
        response += `\n... and ${data.length - 5} more items`;
      }
      
      return response;
    }

    // For objects, format as key-value pairs
    if (typeof data === 'object' && Object.keys(data).length > 0) {
      let response = `📊 Analysis Result:\n\n`;
      for (const [key, value] of Object.entries(data)) {
        const label = key.replace(/_/g, " ").toLowerCase();
        response += `• ${label}: ${value}\n`;
      }
      return response;
    }

    return "I've processed your query but don't have specific results to share. Please try asking a different question.";
  } catch (error) {
    console.error("Error formatting response:", error.message);
    return "Unable to format response. Please try again.";
  }
}

/**
 * Get quick suggestions for chatbot UI
 */
function getQuickSuggestions() {
  return [
    { text: "Top 10 products?", icon: "🏆" },
    { text: "Low stock alert?", icon: "🚨" },
    { text: "Sales this month?", icon: "📊" },
    { text: "Profitability analysis?", icon: "💰" },
    { text: "Supplier performance?", icon: "🤝" },
    { text: "Business overview?", icon: "📈" },
    { text: "Revenue trends?", icon: "📉" },
    { text: "Inventory value?", icon: "📦" }
  ];
}

// Export functions
module.exports = {
  processUserQuery,
  getQuickSuggestions,
  getTopProducts,
  getRevenueTrends,
  getTrendInsights,
  getLowStockItems
};

/**
 * Helper: Get start date based on time period
 */
function getStartDate(timePeriod) {
  const now = new Date();

  // Check if it's a custom day count (e.g., "3days", "7days")
  if (timePeriod && typeof timePeriod === 'string') {
    const customDaysMatch = timePeriod.match(/(\d+)\s*days?/i);
    if (customDaysMatch) {
      const days = parseInt(customDaysMatch[1]);
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - days);
      return startDate;
    }
  }

  switch(timePeriod) {
    case "today":
      return new Date(now.setHours(0, 0, 0, 0));
    case "week":
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return weekAgo;
    case "month":
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return monthAgo;
    case "year":
      const yearAgo = new Date(now);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      return yearAgo;
    default:
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return thirtyDaysAgo;
  }
}

/**
 * Call internal analytics API endpoint
 */
async function callAnalyticsAPI(endpoint, params = {}) {
  try {
    // Build query string
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}${endpoint}${queryString ? "?" + queryString : ""}`;

    // Make request with admin token or service token
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        // Note: In production, use a service token or admin token here
      },
      timeout: 5000,
    });

    return {
      data: response.data || [],
    };
  } catch (error) {
    console.error(`API Call Error for ${endpoint}:`, error.message);
    throw new Error(`Failed to fetch data from ${endpoint}`);
  }
}

/**
 * Format analytics response with natural language
 */
async function formatResponse(userQuery, analyticsData, intentData) {
  try {
    // Handle trend insights with special formatting
    if ((intentData.intent === "trend_insights" || intentData.intent === "year_comparison") && 
        analyticsData && analyticsData.insight) {
      return analyticsData.insight;
    }

    // Skip Gemini - use pattern-based formatting instead
    if (Array.isArray(analyticsData) && analyticsData.length > 0) {
      const itemCount = analyticsData.length;
      const firstKey = Object.keys(analyticsData[0])[0];
      const intentName = intentData.intent.replace(/_/g, ' ');

      return `I found ${itemCount} results for your query about ${intentName}. Here's a summary of the data retrieved:`;
    }

    if (analyticsData && typeof analyticsData === "object" && Object.keys(analyticsData).length > 0) {
      const keys = Object.keys(analyticsData);
      let summary = `Based on your query about ${intentData.intent.replace(/_/g, ' ')}, here are the key metrics:\n`;

      keys.slice(0, 3).forEach(key => {
        const value = analyticsData[key];
        const keyLabel = key.replace(/_/g, ' ');
        summary += `• ${keyLabel}: ${value}\n`;
      });

      return summary;
    }

    return `I retrieved data for your query about ${intentData.intent.replace(/_/g, ' ')}. Please check the data panel for details.`;
  } catch (error) {
    console.error("Response Formatting Error:", error.message);
    return `Retrieved results for your query about ${intentData.intent}. Check the data panel for details.`;
  }
}

/**
 * Get predefined quick suggestions for UI buttons
 */
function getQuickSuggestions() {
  return {
    sales: [
      {
        label: "📈 Top 5 Products This Month",
        query: "What are my top 5 selling products this month?",
      },
      {
        label: "💰 Revenue Trend - Last 7 Days",
        query: "Show my revenue trend for the last 7 days",
      },
      {
        label: "📊 Total Sales Today",
        query: "What are my total sales for today?",
      },
    ],
    inventory: [
      {
        label: "⚠️ Low Stock Items",
        query: "Show me items with low stock levels",
      },
      {
        label: "📦 Current Inventory Value",
        query: "What is my current total inventory value?",
      },
      {
        label: "🚀 Fast Moving Products",
        query: "Which products are selling the fastest?",
      },
    ],
    suppliers: [
      {
        label: "⏳ Pending Orders",
        query: "Show me suppliers with pending orders",
      },
      {
        label: "⭐ Best Performing Supplier",
        query: "Which supplier is performing best?",
      },
      {
        label: "💳 Supplier Balance Summary",
        query: "What are my pending supplier balances?",
      },
    ],
  };
}

module.exports = {
  processUserQuery,
  extractIntent,
  extractIntentFallback,
  executeAnalyticsQuery,
  formatResponse,
  getQuickSuggestions,
};
