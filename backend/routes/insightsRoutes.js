const express = require('express');
const router = express.Router();

const { getOpenRouterService } = require('../services/openrouterService');
const authMiddleware = require('../middleware/authmiddleware');
const roleMiddleware = require('../middleware/rolemiddleware');

// Initialize OpenRouter service
const llmService = getOpenRouterService();

// Apply authentication to all routes
router.use(authMiddleware);
router.use(roleMiddleware(['admin', 'manager']));

// ============================
// HEALTH CHECK
// ============================
/**
 * Check OpenRouter API service status
 * GET /api/insights/health
 */
router.get('/health', async (req, res) => {
  try {
    // Test OpenRouter connectivity
    const isHealthy = await llmService.healthCheck();
    const stats = llmService.getKeyStats();
    
    res.json({
      status: isHealthy ? 'connected' : 'disconnected',
      message: isHealthy 
        ? `OpenRouter API service is running (${stats.model})`
        : 'OpenRouter API service is not available',
      provider: stats.provider,
      model: stats.model,
      serviceStatus: stats.serviceStatus,
      totalKeys: stats.totalKeys,
      keyStats: stats,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date()
    });
  }
});

// ============================
// SERVICE STATUS (Advanced)
// ============================
/**
 * Get comprehensive service status including queue
 * GET /api/insights/status
 */
router.get('/status', async (req, res) => {
  try {
    const serviceStatus = llmService.getServiceStatus();
    
    res.json({
      success: true,
      data: serviceStatus,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date()
    });
  }
});

// ============================
// QUEUE MANAGEMENT
// ============================
/**
 * Get queue status
 * GET /api/insights/queue/status
 */
router.get('/queue/status', async (req, res) => {
  try {
    const queueStatus = llmService.getQueueStatus();
    
    res.json({
      success: true,
      queueStatus,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date()
    });
  }
});

/**
 * Process queued requests
 * POST /api/insights/queue/process
 */
router.post('/queue/process', async (req, res) => {
  try {
    await llmService.processQueuedRequests();
    const queueStatus = llmService.getQueueStatus();
    
    res.json({
      success: true,
      message: 'Queued requests processed',
      queueStatus,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date()
    });
  }
});

// ============================
// GENERATE GENERAL INSIGHT
// ============================
/**
 * Generate custom insight from query using Gemini with multi-key support
 * POST /api/insights/generate
 */
router.post('/generate', async (req, res) => {
  try {
    const { query, language = 'en' } = req.body;

    if (!query) {
      return res.status(400).json({ 
        error: 'Query is required' 
      });
    }

    // Build multi-language prompt
    const systemPrompt = language === 'hi' 
      ? 'आप एक स्मार्ट इन्वेंटरी प्रबंधन सहायक हैं। हिंदी में स्पष्ट, कार्यकारी अंतर्दृष्टि प्रदान करें।'
      : 'You are an intelligent inventory management assistant. Provide clear, actionable insights.';
    
    const prompt = `${systemPrompt}

Query: ${query}

Format your response with clear sections using ### headers for better readability:
### Summary
### Key Points  
### Recommendations

Keep each section focused and use bullet points for lists.`;

    const result = await llmService.generateText(prompt, {
      temperature: 0.7,
      maxOutputTokens: 1024
    });

    if (result.success) {
      res.json({
        success: true,
        insight: result.response.trim(),
        language: language,
        keyUsed: result.keyUsed,
        totalKeys: result.totalKeys,
        timestamp: new Date()
      });
    } else {
      res.status(503).json({
        success: false,
        error: result.error,
        message: result.message,
        keyStats: result.keyStats,
        timestamp: new Date()
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate insight',
      details: error.message,
      timestamp: new Date()
    });
  }
});

// ============================
// GENERATE HINDI INSIGHT
// ============================
/**
 * Generate insight in Hindi using Gemini with multi-key support
 * POST /api/insights/generate-hindi
 */
router.post('/generate-hindi', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ 
        error: 'Query is required' 
      });
    }

    const prompt = `आप एक स्मार्ट इन्वेंटरी प्रबंधन सहायक हैं। निम्नलिखित प्रश्न का हिंदी में उत्तर दें:\n\n${query}`;

    const result = await llmService.generateText(prompt, {
      temperature: 0.7,
      maxOutputTokens: 1024
    });

    if (result.success) {
      res.json({
        success: true,
        insight: result.response.trim(),
        language: 'hi',
        keyUsed: result.keyUsed,
        totalKeys: result.totalKeys,
        timestamp: new Date()
      });
    } else {
      res.status(503).json({
        success: false,
        error: result.error,
        keyStats: result.keyStats,
        timestamp: new Date()
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate Hindi insight',
      details: error.message,
      timestamp: new Date()
    });
  }
});

// ============================
// INVENTORY INSIGHTS
// ============================
/**
 * Generate insights from inventory data using Gemini
 * POST /api/insights/inventory
 */
router.post('/inventory', async (req, res) => {
  try {
    const { inventoryData, language = 'en' } = req.body;

    console.log('📊 [INVENTORY ENDPOINT] Received data:', {
      products: inventoryData?.lowStockProducts?.length || 0,
      productNames: inventoryData?.lowStockProducts?.map(p => p.name) || [],
      totalProducts: inventoryData?.totalProducts,
      language: language
    });

    if (!inventoryData) {
      return res.status(400).json({ 
        error: 'Inventory data is required' 
      });
    }

    const prompt = `Analyze this inventory data and provide structured insights in ${language === 'hi' ? 'Hindi' : 'English'}.

Inventory Summary:
- Total Products: ${inventoryData.totalProducts}
- Low Stock Items: ${inventoryData.lowStockCount}
- Out of Stock: ${inventoryData.outOfStock || 0}
- Total Stock Value: ${inventoryData.totalValue}

Low Stock Products:
${inventoryData.lowStockProducts?.map(p => `- ${p.name}: ${p.current_stock} units (Reorder: ${p.reorder_point})`).join('\n')}

Format your response with clear sections using ### headers:
### Key Concerns
(List 3-4 main concerns as bullet points)

### Immediate Actions
(List specific, actionable steps)

### Priority Level
(Rate as High/Medium/Low with reasoning)

### Expected Impact
(Brief description of expected improvements)`;

    const result = await llmService.generateText(prompt, {
      temperature: 0.7,
      maxOutputTokens: 1024
    });

    if (result.success) {
      res.json({
        success: true,
        category: 'inventory',
        insight: result.response.trim(),
        language: language,
        keyUsed: result.keyUsed,
        totalKeys: result.totalKeys,
        timestamp: new Date()
      });
    } else {
      res.status(503).json({
        success: false,
        error: result.error,
        message: result.message,
        keyStats: result.keyStats,
        timestamp: new Date()
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate inventory insights',
      details: error.message,
      timestamp: new Date()
    });
  }
});

// ============================
// SALES INSIGHTS
// ============================
/**
 * Generate insights from sales data using Gemini
 * POST /api/insights/sales
 */
router.post('/sales', async (req, res) => {
  try {
    const { salesData, language = 'en' } = req.body;

    if (!salesData) {
      return res.status(400).json({ 
        error: 'Sales data is required' 
      });
    }

    const prompt = `Analyze this sales data and provide insights in ${language === 'hi' ? 'Hindi' : 'English'}:

Sales Summary:
- Total Sales (Today): ${salesData.todayTotal}
- Total Sales (This Week): ${salesData.weekTotal}
- Total Sales (This Month): ${salesData.monthTotal}
- Average Order Value: ${salesData.avgOrderValue}
- Top Product: ${salesData.topProduct}
- Total Orders: ${salesData.totalOrders}

Format your response with clear sections:
### Current Trends
(Analyze sales patterns and trends)

### Opportunities
(Identify growth opportunities and untapped potential)

### Recommended Actions
(List specific, actionable steps to increase sales)

### Performance Forecast
(Brief outlook for next period)`;

    const result = await llmService.generateText(prompt, {
      temperature: 0.7,
      maxOutputTokens: 1024
    });

    if (result.success) {
      res.json({
        success: true,
        category: 'sales',
        insight: result.response.trim(),
        language: language,
        keyUsed: result.keyUsed,
        totalKeys: result.totalKeys,
        timestamp: new Date()
      });
    } else {
      res.status(503).json({
        success: false,
        error: result.error,
        message: result.message,
        keyStats: result.keyStats,
        timestamp: new Date()
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate sales insights',
      details: error.message,
      timestamp: new Date()
    });
  }
});

// ============================
// SUPPLIER INSIGHTS
// ============================
/**
 * Generate insights from supplier data using Gemini
 * POST /api/insights/supplier
 */
router.post('/supplier', async (req, res) => {
  try {
    const { supplierData, language = 'en' } = req.body;

    if (!supplierData) {
      return res.status(400).json({ 
        error: 'Supplier data is required' 
      });
    }

    const prompt = `Analyze supplier performance and provide insights in ${language === 'hi' ? 'Hindi' : 'English'}:

Supplier Performance:
- Total Suppliers: ${supplierData.totalSuppliers}
- Average Lead Time: ${supplierData.avgLeadTime} days
- On-Time Delivery Rate: ${supplierData.onTimeRate}%
- Quality Score: ${supplierData.qualityScore}/10
- Total Payments: ${supplierData.totalPayments}

Top Suppliers:
${supplierData.topSuppliers?.map(s => `- ${s.name}: ${s.performance} performance`).join('\n')}

Format your response with clear sections:
### Performance Summary
(Overall assessment of supplier network)

### Negotiation Opportunities
(Specific areas for improvement and leverage points)

### Risk Mitigation Steps
(Actions to reduce supplier dependency and improve resilience)

### Strategic Recommendations
(Long-term supplier relationship strategy)`;

    const result = await llmService.generateText(prompt, {
      temperature: 0.7,
      maxOutputTokens: 1024
    });

    if (result.success) {
      res.json({
        success: true,
        category: 'supplier',
        insight: result.response.trim(),
        language: language,
        keyUsed: result.keyUsed,
        totalKeys: result.totalKeys,
        timestamp: new Date()
      });
    } else {
      res.status(503).json({
        success: false,
        error: result.error,
        message: result.message,
        keyStats: result.keyStats,
        timestamp: new Date()
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate supplier insights',
      details: error.message,
      timestamp: new Date()
    });
  }
});

// ============================
// ACTIONABLE SUMMARY
// ============================
/**
 * Generate actionable summary with steps using Gemini
 * POST /api/insights/actionable-summary
 */
router.post('/actionable-summary', async (req, res) => {
  try {
    const { data, category, language = 'en' } = req.body;

    if (!data || !category) {
      return res.status(400).json({ 
        error: 'Data and category are required',
        categories: ['inventory', 'sales', 'supplier']
      });
    }

    const prompt = `Generate an actionable summary for ${category} data in ${language === 'hi' ? 'Hindi' : 'English'}:

Data:
${JSON.stringify(data, null, 2)}

Format your response with clear sections:
### Key Findings
(Main observations and critical insights)

### Actionable Steps
1. (First priority action)
2. (Second priority action)
3. (Third priority action)
4. (Additional recommendations)

### Priority Level
(Rate as Critical/High/Medium/Low)

### Expected Outcomes
(Measurable results expected from implementing these steps)`;

    const result = await llmService.generateText(prompt, {
      temperature: 0.7,
      maxOutputTokens: 1024
    });

    if (result.success) {
      res.json({
        success: true,
        category: category,
        summary: result.response.trim(),
        language: language,
        actionable: true,
        keyUsed: result.keyUsed,
        totalKeys: result.totalKeys,
        timestamp: new Date()
      });
    } else {
      res.status(503).json({
        success: false,
        error: result.error,
        message: result.message,
        keyStats: result.keyStats,
        timestamp: new Date()
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate actionable summary',
      details: error.message,
      timestamp: new Date()
    });
  }
});

// ============================
// BATCH INSIGHTS
// ============================
/**
 * Generate multiple insights at once using Gemini
 * POST /api/insights/batch
 */
router.post('/batch', async (req, res) => {
  try {
    const { queries, language = 'en' } = req.body;

    if (!Array.isArray(queries) || queries.length === 0) {
      return res.status(400).json({ 
        error: 'Queries array is required' 
      });
    }

    // Process queries in parallel
    const promises = queries.map(query =>
      llmService.generateText(query, {
        temperature: 0.7,
        maxOutputTokens: 512
      })
    );

    const results = await Promise.all(promises);

    res.json({
      success: true,
      count: results.length,
      insights: results.map(r => ({
        success: r.success,
        response: r.response?.trim(),
        error: r.error,
        keyUsed: r.keyUsed
      })),
      language: language,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate batch insights',
      details: error.message,
      timestamp: new Date()
    });
  }
});

// ============================
// TRANSLATE TEXT
// ============================
/**
 * Translate text to different language using Gemini
 * POST /api/insights/translate
 */
router.post('/translate', async (req, res) => {
  try {
    const { text, targetLanguage = 'hi' } = req.body;

    if (!text) {
      return res.status(400).json({ 
        error: 'Text is required' 
      });
    }

    const prompt = `Translate the following text to ${targetLanguage === 'hi' ? 'Hindi' : 'English'}. Provide only the translation, no explanation:

Original: "${text}"

Translation:`;

    const result = await llmService.generateText(prompt, {
      temperature: 0.3,
      maxOutputTokens: 512
    });

    if (result.success) {
      res.json({
        success: true,
        original: text,
        translated: result.response.trim(),
        targetLanguage: targetLanguage,
        keyUsed: result.keyUsed,
        totalKeys: result.totalKeys,
        timestamp: new Date()
      });
    } else {
      res.status(503).json({
        success: false,
        error: result.error,
        keyStats: result.keyStats,
        timestamp: new Date()
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Failed to translate',
      details: error.message,
      timestamp: new Date()
    });
  }
});

// ============================
// GET API STATUS & KEY INFO
// ============================
/**
 * Get Gemini API status and key information
 * GET /api/insights/models
 */
router.get('/models', async (req, res) => {
  try {
    const stats = llmService.getKeyStats();

    res.json({
      success: true,
      provider: 'Google Gemini API',
      model: 'gemini-pro',
      multiKeySupport: true,
      keyStats: stats,
      status: llmService.areAllKeysExhausted() ? 'degraded' : 'active',
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch API status',
      details: error.message,
      timestamp: new Date()
    });
  }
});

module.exports = router;
