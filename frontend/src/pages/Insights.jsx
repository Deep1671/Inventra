import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Format insight text with proper structure
const FormatInsightText = ({ text }) => {
  if (!text) return <p className="text-gray-200">No content available</p>;

  // Split by section headers (###)
  const sections = text.split(/###\s+/).filter(s => s.trim());
  
  return (
    <div className="space-y-4">
      {sections.map((section, idx) => {
        const lines = section.split('\n').filter(l => l.trim());
        if (lines.length === 0) return null;

        const title = lines[0].trim();
        const content = lines.slice(1).join('\n');

        return (
          <div key={idx} className="border-l-4 border-blue-500 pl-4">
            <h4 className="text-lg font-semibold text-blue-400 mb-2">{title}</h4>
            <div className="text-gray-200 space-y-2">
              {content
                .split('\n')
                .filter(l => l.trim())
                .map((line, lineIdx) => {
                  // Handle bullet points
                  if (line.trim().startsWith('-')) {
                    return (
                      <div key={lineIdx} className="flex gap-3 ml-2">
                        <span className="text-blue-400 font-bold">•</span>
                        <span className="flex-1">
                          {line
                            .trim()
                            .substring(1)
                            .trim()
                            .replace(/\*\*([^*]+)\*\*/g, (m, p1) => p1)
                            .split(/(\*\*[^*]+\*\*)/g)
                            .map((part, i) =>
                              part.includes('**') ? (
                                <strong key={i} className="text-yellow-300">
                                  {part.replace(/\*\*/g, '')}
                                </strong>
                              ) : (
                                <span key={i}>{part}</span>
                              )
                            )}
                        </span>
                      </div>
                    );
                  }
                  
                  // Handle regular text with bold
                  return (
                    <p key={lineIdx} className="leading-relaxed">
                      {line
                        .replace(/\*\*([^*]+)\*\*:?/g, '<mark-bold>$1:</mark-bold>')
                        .split('<mark-bold>')
                        .map((part, i) =>
                          part.includes('</mark-bold>') ? (
                            <strong key={i} className="text-yellow-300">
                              {part.replace('</mark-bold>', '')}
                            </strong>
                          ) : (
                            <span key={i}>{part}</span>
                          )
                        )}
                    </p>
                  );
                })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Insights = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState(() => {
    const rawUser = localStorage.getItem("user")
    return rawUser ? JSON.parse(rawUser) : null
  })
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [language, setLanguage] = useState('en');
  const [category, setCategory] = useState('inventory');
  const [llmStatus, setLLMStatus] = useState('checking');
  const [customQuery, setCustomQuery] = useState('');

  const API_BASE = 'http://localhost:5000/api';

  // Check user role on mount
  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/")
      return
    }
  }, [user, navigate])

  // Check LLM health on mount
  useEffect(() => {
    checkLLMHealth();
  }, []);

  // Check if Gemini API is connected
  const checkLLMHealth = async () => {
    try {
      const response = await axios.get(`${API_BASE}/insights/health`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setLLMStatus('connected');
    } catch (err) {
      setLLMStatus('disconnected');
      setError('Gemini API service is not available. Please check your API keys in .env');
    }
  };

  // Generate insights based on category or custom query with all system aspects
  const generateInsights = async () => {
    if (llmStatus !== 'connected') {
      setError('Gemini API service not available. Check your API configuration.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // If custom query is provided, analyze ALL aspects of the system
      if (customQuery && customQuery.trim()) {
        console.log('📊 Custom query detected - fetching all system data...');
        
        // Fetch data from all categories
        const [inventoryData, salesData, supplierData] = await Promise.all([
          fetchRealInventoryData(),
          fetchRealSalesData(),
          fetchRealSupplierData()
        ]);

        // Prepare comprehensive context
        const comprehensiveContext = {
          inventory: inventoryData,
          sales: salesData,
          supplier: supplierData,
          query: customQuery
        };

        console.log('🔄 Sending comprehensive analysis request:', comprehensiveContext);

        const response = await axios.post(
          `${API_BASE}/insights/generate`,
          {
            query: `You have access to ALL business data. Answer this query comprehensively: "${customQuery}"
            
INVENTORY DATA:
- Total Products: ${inventoryData?.totalProducts || 0}
- Low Stock Items: ${inventoryData?.lowStockCount || 0}
- Out of Stock: ${inventoryData?.outOfStock || 0}
- Total Inventory Value: ${inventoryData?.totalValue || 0}

SALES DATA:
- Today's Sales: ${salesData?.todayTotal || 0}
- This Week's Sales: ${salesData?.weekTotal || 0}
- This Month's Sales: ${salesData?.monthTotal || 0}
- Average Order Value: ${salesData?.avgOrderValue || 0}
- Top Product: ${salesData?.topProduct || 'N/A'}
- Total Orders: ${salesData?.totalOrders || 0}

SUPPLIER DATA:
- Total Suppliers: ${supplierData?.totalSuppliers || 0}
- Average Lead Time: ${supplierData?.avgLeadTime || 0} days
- On-Time Delivery Rate: ${supplierData?.onTimeRate || 0}%
- Quality Score: ${supplierData?.qualityScore || 0}/10

Provide actionable, comprehensive insights that consider all these aspects.`,
            language: language
          },
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }
        );

        const newInsight = {
          id: Date.now(),
          category: 'comprehensive',
          insight: response.data.insight,
          language: response.data.language,
          timestamp: new Date(response.data.timestamp).toLocaleString(),
          model: response.data.model,
          keyUsed: response.data.keyUsed,
          totalKeys: response.data.totalKeys
        };

        setInsights([newInsight, ...insights]);
        setCustomQuery(''); // Clear custom query after sending
      } else {
        // Use category-based insight
        await generateCategoryInsight(category);
      }
    } catch (err) {
      console.error('❌ Error generating insight:', err);
      setError(err.response?.data?.message || 'Failed to generate insight');
    } finally {
      setLoading(false);
    }
  };

  // Get predefined query based on category
  const getCategoryQuery = () => {
    const queries = {
      inventory: 'What are the current inventory challenges and top 3 actions to take?',
      sales: 'Analyze current sales performance and suggest improvements',
      supplier: 'Evaluate supplier performance and recommend optimization steps',
      general: 'Provide business insights and recommendations'
    };
    return queries[category] || queries.general;
  };

  // Fetch real inventory data
  const fetchRealInventoryData = async () => {
    try {
      console.log('📦 Fetching products from:', `${API_BASE}/products`);
      const response = await axios.get(`${API_BASE}/products`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const products = response.data || [];
      console.log('✓ Received products:', products.length, products.slice(0, 2));
      
      const lowStockProducts = products
        .filter(p => p.current_stock < p.reorder_point)
        .slice(0, 5)
        .map(p => ({
          name: p.name,
          current_stock: p.current_stock,
          reorder_point: p.reorder_point
        }));

      console.log('✓ Low stock products:', lowStockProducts);

      const totalValue = products.reduce((sum, p) => sum + (p.current_stock * (p.cost_price || 0)), 0);

      const result = {
        totalProducts: products.length,
        lowStockCount: products.filter(p => p.current_stock < p.reorder_point).length,
        outOfStock: products.filter(p => p.current_stock === 0).length,
        totalValue: totalValue,
        lowStockProducts: lowStockProducts
      };
      console.log('✓ Inventory data ready:', result);
      return result;
    } catch (err) {
      console.error('❌ Error fetching inventory:', err.message, err.response?.status);
      return null;
    }
  };

  // Fetch real sales data
  const fetchRealSalesData = async () => {
    try {
      const response = await axios.get(`${API_BASE}/sales`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      // Handle both array and object responses
      const salesOrders = Array.isArray(response.data) ? response.data : (response.data?.data || []);
      
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0];
      const monthAgo = new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0];

      const todayTotal = salesOrders
        .filter(s => new Date(s.order_date).toISOString().split('T')[0] === today)
        .reduce((sum, s) => sum + (s.total_amount || 0), 0);
      
      const weekTotal = salesOrders
        .filter(s => new Date(s.order_date) >= new Date(weekAgo))
        .reduce((sum, s) => sum + (s.total_amount || 0), 0);
      
      const monthTotal = salesOrders
        .filter(s => new Date(s.order_date) >= new Date(monthAgo))
        .reduce((sum, s) => sum + (s.total_amount || 0), 0);

      const avgOrderValue = salesOrders.length > 0 ? monthTotal / salesOrders.length : 0;
      
      // Get top product by quantity from sales order items
      let topProduct = 'No sales';
      if (salesOrders.length > 0) {
        const topItem = salesOrders
          .flatMap(s => s.items || [])
          .sort((a, b) => (b.quantity || 0) - (a.quantity || 0))[0];
        topProduct = topItem?.product_name || 'Top Product';
      }

      // Count total items sold
      const totalOrders = salesOrders
        .flatMap(s => s.items || [])
        .length;

      return {
        todayTotal: todayTotal,
        weekTotal: weekTotal,
        monthTotal: monthTotal,
        avgOrderValue: avgOrderValue,
        topProduct: topProduct,
        totalOrders: totalOrders
      };
    } catch (err) {
      console.error('Error fetching sales:', err);
      return null;
    }
  };

  // Fetch real supplier data
  const fetchRealSupplierData = async () => {
    try {
      const response = await axios.get(`${API_BASE}/suppliers`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const suppliers = response.data || [];
      
      const topSuppliers = suppliers
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 3)
        .map(s => ({
          name: s.name || s.supplier_name,
          performance: (s.rating || 0) >= 4 ? 'Excellent' : (s.rating || 0) >= 3 ? 'Good' : 'Fair'
        }));

      const avgLeadTime = suppliers.length > 0
        ? suppliers.reduce((sum, s) => sum + (s.lead_time_days || 7), 0) / suppliers.length
        : 0;

      return {
        totalSuppliers: suppliers.length,
        avgLeadTime: Math.round(avgLeadTime),
        onTimeRate: suppliers.length > 0 ? 85 : 0,
        qualityScore: suppliers.length > 0 ? 8.5 : 0,
        totalPayments: 500000,
        topSuppliers: topSuppliers
      };
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      return null;
    }
  };

  // Generate specific category insights
  const generateCategoryInsight = async (cat) => {
    setCategory(cat);
    setLoading(true);
    setError(null);

    try {
      let endpoint, payload;

      if (cat === 'inventory') {
        const inventoryData = await fetchRealInventoryData();
        if (!inventoryData) {
          setError('Failed to fetch inventory data');
          setLoading(false);
          return;
        }
        endpoint = '/inventory';
        payload = {
          inventoryData: inventoryData,
          language: language
        };
      } else if (cat === 'sales') {
        const salesData = await fetchRealSalesData();
        if (!salesData) {
          setError('Failed to fetch sales data');
          setLoading(false);
          return;
        }
        endpoint = '/sales';
        payload = {
          salesData: salesData,
          language: language
        };
      } else if (cat === 'supplier') {
        const supplierData = await fetchRealSupplierData();
        if (!supplierData) {
          setError('Failed to fetch supplier data');
          setLoading(false);
          return;
        }
        endpoint = '/supplier';
        payload = {
          supplierData: supplierData,
          language: language
        };
      }

      console.log('📤 Sending to LLM:', endpoint, payload);
      const response = await axios.post(
        `${API_BASE}/insights${endpoint}`,
        payload,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      console.log('✓ LLM Response:', response.data);

      const newInsight = {
        id: Date.now(),
        category: cat,
        insight: response.data.insight,
        language: language,
        timestamp: new Date(response.data.timestamp).toLocaleString(),
        model: response.data.model
      };

      setInsights([newInsight, ...insights]);
    } catch (err) {
      console.error('❌ Insight error:', err.message);
      setError(err.response?.data?.message || `Failed to generate ${cat} insights`);
    } finally {
      setLoading(false);
    }
  };

  // Generate actionable summary
  const generateActionableSummary = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_BASE}/insights/actionable-summary`,
        {
          data: { sample: 'inventory data' },
          category: category,
          language: language
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );

      const newInsight = {
        id: Date.now(),
        category: `${category}-actionable`,
        insight: response.data.summary,
        language: language,
        timestamp: new Date(response.data.timestamp).toLocaleString(),
        actionable: true,
        model: response.data.model || 'mistral'
      };

      setInsights([newInsight, ...insights]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate actionable summary');
    } finally {
      setLoading(false);
    }
  };

  // Clear insights
  const clearInsights = () => {
    setInsights([]);
  };

  // Delete single insight
  const deleteInsight = (id) => {
    setInsights(insights.filter(i => i.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">AI Insights</h1>
            <p className="text-gray-400">Generate intelligent insights using OpenRouter API</p>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Language Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 outline-none"
            >
              <option value="en">English</option>
              <option value="hi">Hindi (हिंदी)</option>
            </select>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 outline-none"
            >
              <option value="inventory">Inventory</option>
              <option value="sales">Sales</option>
              <option value="supplier">Supplier</option>
              <option value="general">General</option>
            </select>
          </div>

          {/* Button Group */}
          <div className="col-span-2 flex gap-2">
            <button
              onClick={generateInsights}
              disabled={loading || llmStatus !== 'connected'}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-2 rounded-lg transition"
            >
              {loading ? 'Generating...' : 'Generate Insight'}
            </button>
            <button
              onClick={clearInsights}
              className="px-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 rounded-lg transition"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Quick Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <button
            onClick={() => generateCategoryInsight('inventory')}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white py-2 rounded-lg font-semibold transition"
          >
            📦 Inventory
          </button>
          <button
            onClick={() => generateCategoryInsight('sales')}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-2 rounded-lg font-semibold transition"
          >
            📊 Sales
          </button>
          <button
            onClick={() => generateCategoryInsight('supplier')}
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white py-2 rounded-lg font-semibold transition"
          >
            🏢 Supplier
          </button>
          <button
            onClick={generateActionableSummary}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 rounded-lg font-semibold transition"
          >
            ✅ Actionable
          </button>
        </div>

        {/* Custom Query */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-300 mb-2">Custom Query</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              placeholder="Ask anything about your business..."
              className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 outline-none"
            />
            <button
              onClick={generateInsights}
              disabled={loading || !customQuery}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold px-6 py-2 rounded-lg transition"
            >
              Ask
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900 border border-red-700 text-red-200 rounded-lg">
            {error}
          </div>
        )}

        {/* Insights Display */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">Insights Generated</h2>
          {insights.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg">No insights generated yet</p>
              <p className="text-sm">Click a button above or enter a custom query to get started</p>
            </div>
          ) : (
            insights.map((insight) => (
              <div key={insight.id} className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-blue-500 transition">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                        {insight.category.toUpperCase()}
                      </span>
                      {insight.actionable && (
                        <span className="inline-block bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                          ✓ ACTIONABLE
                        </span>
                      )}
                      <span className="inline-block bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">
                        {insight.language === 'hi' ? 'हिंदी' : 'English'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{insight.timestamp}</p>
                  </div>
                  <button
                    onClick={() => deleteInsight(insight.id)}
                    className="text-gray-400 hover:text-red-400 transition text-lg"
                  >
                    ✕
                  </button>
                </div>
                <div className="bg-gray-900 rounded p-4 mb-3 overflow-y-auto max-h-96">
                  <FormatInsightText text={insight.insight} />
                </div>
                <p className="text-xs text-gray-500">Model: {insight.model}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Insights;
