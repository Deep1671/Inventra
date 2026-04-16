const { getOpenRouterService } = require('./openrouterService');

const llmService = getOpenRouterService();

// LLM Service - Now powered by OpenRouter API (Google Gemma 4 31B IT)
// All requests are routed through OpenRouter with queuing support

const DEFAULT_MODEL = 'gemini-pro';

// Language transliterations and templates
const LANGUAGE_TEMPLATES = {
  hi: {
    inventory_low: 'निम्नलिखित उत्पाद कम स्टॉक में हैं:',
    suggestion: 'सुझाव:',
    action: 'कार्रवाई:',
    recommendation: 'अनुशंसा:',
  },
  en: {
    inventory_low: 'The following products are low in stock:',
    suggestion: 'Suggestion:',
    action: 'Action:',
    recommendation: 'Recommendation:',
  }
};

// ============================
// CHECK CONNECTION (OpenRouter)
// ============================
const checkGeminiConnection = async () => {
  try {
    const stats = llmService.getKeyStats();
    return stats.totalKeys > 0 && !llmService.areAllKeysExhausted();
  } catch (error) {
    console.error('OpenRouter connection check failed:', error.message);
    return false;
  }
};

// ============================
// GENERATE INSIGHTS (OpenRouter)
// ============================
const generateInsight = async (query, language = 'en', model = DEFAULT_MODEL) => {
  try {
    let systemPrompt = buildSystemPrompt(language);
    const prompt = `${systemPrompt}\n\n${query}`;
    
    const response = await llmService.generateText(prompt, {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 1024
    });

    if (response.success) {
      return {
        success: true,
        response: response.response,
        model: DEFAULT_MODEL,
        language: language,
        keyUsed: response.keyUsed,
        totalKeys: response.totalKeys
      };
    } else {
      return {
        success: false,
        error: response.error,
        message: response.message || 'Failed to generate insight using Gemini'
      };
    }
  } catch (error) {
    console.error('LLM Error:', error.message);
    return {
      success: false,
      error: error.message,
      message: 'Failed to generate insight. Check API keys and quota.'
    };
  }
};

// ============================
// BUILD SYSTEM PROMPT
// ============================
const buildSystemPrompt = (language = 'en') => {
  const prompts = {
    en: `You are an intelligent inventory management assistant. 
Provide clear, actionable insights about inventory, sales, and business metrics.
Be concise (2-3 sentences max) unless asked for details.
Focus on practical recommendations.`,
    
    hi: `आप एक बुद्धिमान इन्वेंटरी प्रबंधन सहायक हैं।
इन्वेंटरी, बिक्री और व्यावसायिक मेट्रिक्स के बारे में स्पष्ट, कार्यकारी अंतर्दृष्टि प्रदान करें।
संक्षिप्त रहें (जब तक विस्तार न कहा जाए तब तक 2-3 वाक्य)।
व्यावहारिक सिफारिशों पर ध्यान केंद्रित करें।`
  };

  return prompts[language] || prompts.en;
};

// ============================
// GENERATE INVENTORY INSIGHTS
// ============================
const generateInventoryInsights = async (inventoryData, language = 'en', model = DEFAULT_MODEL) => {
  try {
    console.log('🔄 [LLM SERVICE] Processing inventory data:', {
      totalProducts: inventoryData.totalProducts,
      lowStockCount: inventoryData.lowStockCount,
      lowStockProducts: inventoryData.lowStockProducts
    });

    const prompt = `Analyze this inventory data and provide insights in ${language === 'hi' ? 'Hindi' : 'English'}:
    
Inventory Summary:
- Total Products: ${inventoryData.totalProducts}
- Low Stock Items: ${inventoryData.lowStockCount}
- Out of Stock: ${inventoryData.outOfStock}
- Total Stock Value: ${inventoryData.totalValue}

Low Stock Products:
${inventoryData.lowStockProducts?.map(p => `- ${p.name}: ${p.current_stock} units (Reorder: ${p.reorder_point})`).join('\n')}

Please provide:
1. Key concerns
2. Specific actions to take
3. Estimated time to act`;

    console.log('📝 [LLM SERVICE] Generated prompt:\n', prompt);

    return await generateInsight(prompt, language, model);
  } catch (error) {
    console.error('Inventory insight error:', error);
    throw error;
  }
};

// ============================
// GENERATE SALES INSIGHTS
// ============================
const generateSalesInsights = async (salesData, language = 'en', model = DEFAULT_MODEL) => {
  try {
    const prompt = `Analyze this sales data and provide insights in ${language === 'hi' ? 'Hindi' : 'English'}:

Sales Summary:
- Total Sales (Today): ${salesData.todayTotal}
- Total Sales (This Week): ${salesData.weekTotal}
- Total Sales (This Month): ${salesData.monthTotal}
- Average Order Value: ${salesData.avgOrderValue}
- Top Product: ${salesData.topProduct}
- Total Orders: ${salesData.totalOrders}

Please provide:
1. Current trends
2. Opportunities
3. Recommended actions`;

    return await generateInsight(prompt, language, model);
  } catch (error) {
    console.error('Sales insight error:', error);
    throw error;
  }
};

// ============================
// GENERATE SUPPLIER INSIGHTS
// ============================
const generateSupplierInsights = async (supplierData, language = 'en', model = DEFAULT_MODEL) => {
  try {
    const prompt = `Analyze supplier performance and provide insights in ${language === 'hi' ? 'Hindi' : 'English'}:

Supplier Performance:
- Total Suppliers: ${supplierData.totalSuppliers}
- Average Lead Time: ${supplierData.avgLeadTime} days
- On-Time Delivery Rate: ${supplierData.onTimeRate}%
- Quality Score: ${supplierData.qualityScore}/10
- Total Payments: ${supplierData.totalPayments}

Top Suppliers:
${supplierData.topSuppliers?.map(s => `- ${s.name}: ${s.performance} performance`).join('\n')}

Provide:
1. Performance summary
2. Negotiation opportunities
3. Risk mitigation steps`;

    return await generateInsight(prompt, language, model);
  } catch (error) {
    console.error('Supplier insight error:', error);
    throw error;
  }
};

// ============================
// GENERATE CUSTOM INSIGHT
// ============================
const generateCustomInsight = async (dataContext, query, language = 'en', model = DEFAULT_MODEL) => {
  try {
    const prompt = `Based on this business data context, answer the question:

Context:
${JSON.stringify(dataContext, null, 2)}

Question: ${query}

Provide answer in ${language === 'hi' ? 'Hindi' : 'English'} in 2-3 actionable sentences.`;

    return await generateInsight(prompt, language, model);
  } catch (error) {
    console.error('Custom insight error:', error);
    throw error;
  }
};

// ============================
// TRANSLATE TEXT
// ============================
const translateText = async (text, targetLanguage = 'hi', model = DEFAULT_MODEL) => {
  try {
    const prompt = `Translate the following text to ${targetLanguage === 'hi' ? 'Hindi' : 'English'}. Provide only the translation, no explanation:

Original: "${text}"

Translation:`;

    const response = await generateInsight(prompt, 'en', model);
    
    if (response.success) {
      return {
        success: true,
        original: text,
        translated: response.response.trim(),
        targetLanguage: targetLanguage
      };
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    console.error('Translation error:', error);
    return {
      success: false,
      error: error.message,
      original: text
    };
  }
};

// ============================
// GET AVAILABLE MODELS
// ============================
const getAvailableModels = async () => {
  try {
    const stats = llmService.getKeyStats();
    return {
      success: true,
      models: [
        {
          name: DEFAULT_MODEL,
          size: 'N/A',
          digest: 'Google Gemini Pro'
        }
      ],
      keyStats: stats
    };
  } catch (error) {
    console.error('Failed to fetch models:', error.message);
    return {
      success: false,
      error: error.message,
      message: 'Could not fetch API status'
    };
  }
};

// ============================
// BATCH GENERATE INSIGHTS
// ============================
const batchGenerateInsights = async (queries, language = 'en', model = DEFAULT_MODEL) => {
  try {
    const results = await Promise.all(
      queries.map(q => generateInsight(q, language, model))
    );
    return {
      success: true,
      count: results.length,
      insights: results
    };
  } catch (error) {
    console.error('Batch generation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ============================
// Hindi-Specific Insight
// ============================
const generateHindiInsight = async (query, model = DEFAULT_MODEL) => {
  return generateInsight(query, 'hi', model);
};

// ============================
// Create summary with actionable steps
// ============================
const generateActionableSummary = async (data, category, language = 'en', model = DEFAULT_MODEL) => {
  try {
    let query = '';

    if (category === 'inventory') {
      query = `Based on this inventory data: ${JSON.stringify(data)}, 
      provide a brief summary with 3 specific, numbered action steps in ${language === 'hi' ? 'Hindi' : 'English'} 
      that a manager should take immediately.`;
    } else if (category === 'sales') {
      query = `Based on this sales data: ${JSON.stringify(data)}, 
      provide a brief summary with 3 specific, numbered business improvement steps in ${language === 'hi' ? 'Hindi' : 'English'}.`;
    } else if (category === 'supplier') {
      query = `Based on this supplier data: ${JSON.stringify(data)}, 
      provide 3 specific action items in ${language === 'hi' ? 'Hindi' : 'English'} to optimize supplier relationships.`;
    }

    return await generateInsight(query, language, model);
  } catch (error) {
    console.error('Summary generation error:', error);
    throw error;
  }
};

module.exports = {
  // Core functions
  generateInsight,
  checkGeminiConnection,
  buildSystemPrompt,
  
  // Specific insights
  generateInventoryInsights,
  generateSalesInsights,
  generateSupplierInsights,
  generateCustomInsight,
  generateHindiInsight,
  generateActionableSummary,
  
  // Utilities
  translateText,
  getAvailableModels,
  batchGenerateInsights,
  
  // Constants
  DEFAULT_MODEL,
  LANGUAGE_TEMPLATES
};
