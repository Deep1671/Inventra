import { useState, useEffect, useMemo, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import api from "../services/apiClient"
import {
  ResponsiveContainer,
  LineChart,
  BarChart,
  PieChart,
  Line,
  Bar,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts"
import "../styles/aa.css"

function AdvancedAnalytics() {
  const navigate = useNavigate()
  const [user, setUser] = useState(() => {
    const rawUser = localStorage.getItem("user")
    return rawUser ? JSON.parse(rawUser) : null
  })

  const [activeTab, setActiveTab] = useState("revenue")
  const [loadingTab, setLoadingTab] = useState(null)  // ✅ Only track active tab loading

  const [data, setData] = useState({
    revenue: [],
    products: [],
    profit: { products: [], summary: {} },
    supplier: [],
    category: [],
    turnover: [],
    performance: { 
      performance_indexes: {
        profitability_index: { score: 0, margin_percent: 0, profitable_products: 0, total_products: 0, status: "-" },
        inventory_health_index: { score: 0, turnover_rate: 0, stock_value: 0, stock_efficiency: 0, status: "-" },
        sales_velocity_index: { score: 0, total_quantity_sold: 0, avg_per_product: 0, status: "-" },
        overall_health_index: { score: 0, status: "-" },
        category_performance: []
      }
    }
  })

  const [error, setError] = useState(null)
  const [period, setPeriod] = useState("daily")
  const [productSort, setProductSort] = useState("revenue")
  
  // ✅ OPTIMIZATION: Debounce date filter changes (not immediate)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [debouncedStartDate, setDebouncedStartDate] = useState("")
  const [debouncedEndDate, setDebouncedEndDate] = useState("")
  const [dateFilterTimeout, setDateFilterTimeout] = useState(null)

  // Color palettes
  const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6", "#ef4444"]

  // ✅ OPTIMIZATION: Debounce date filter changes (500ms delay)
  useEffect(() => {
    if (dateFilterTimeout) clearTimeout(dateFilterTimeout)
    const timeout = setTimeout(() => {
      setDebouncedStartDate(startDate)
      setDebouncedEndDate(endDate)
    }, 500)
    setDateFilterTimeout(timeout)
    return () => clearTimeout(timeout)
  }, [startDate, endDate])

  // Custom Tooltip Component
  const CustomTooltip = useCallback(({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload
      const xAxisLabel = period === "daily" ? dataPoint._id : dataPoint.date_range
      
      return (
        <div style={{
          background: "rgba(15,23,42,0.95)",
          border: "1px solid rgba(148,163,184,0.2)",
          padding: "10px",
          borderRadius: "4px",
          color: "#e2e8f0"
        }}>
          <p style={{ margin: "0 0 8px 0", fontWeight: "bold", color: "#60a5fa" }}>
            {xAxisLabel}
          </p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: "4px 0", color: entry.color }}>
              {entry.name}: {entry.name === "Revenue" ? `$${entry.value.toFixed(2)}` : entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }, [period])

  // ✅ OPTIMIZATION: Separate fetch functions with better error handling
  const fetchRevenueTrends = useCallback(async () => {
    try {
      setLoadingTab("revenue")
      setError(null)
      let url = `/analytics/revenue-trends?period=${period}`
      if (debouncedStartDate) url += `&startDate=${debouncedStartDate}`
      if (debouncedEndDate) url += `&endDate=${debouncedEndDate}`
      const res = await api.get(url)
      
      // ✅ STRICT VALIDATION: Enforce predictable response structure
      let trends = res?.data?.trends || res?.data?.data || res?.data || []
      if (!Array.isArray(trends)) {
        trends = []
      }
      setData(prev => ({ ...prev, revenue: trends }))
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || "Failed to load revenue trends"
      console.error("[Revenue Trends Error]", { status: err.response?.status, message: errorMsg, fullError: err })
      setError(errorMsg)
      setData(prev => ({ ...prev, revenue: [] })) // ✅ Reset state on error
    } finally {
      setLoadingTab(null)
    }
  }, [period, debouncedStartDate, debouncedEndDate])

  const fetchTopProducts = useCallback(async () => {
    try {
      setLoadingTab("products")
      setError(null)
      const res = await api.get(`/analytics/top-products?sortBy=${productSort}`)
      
      // ✅ STRICT VALIDATION: Enforce predictable response structure
      let products = res?.data?.top_products || res?.data?.data || res?.data || []
      if (!Array.isArray(products)) {
        products = []
      }
      setData(prev => ({ ...prev, products }))
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || "Failed to load top products"
      console.error("[Top Products Error]", { status: err.response?.status, message: errorMsg, fullError: err })
      setError(errorMsg)
      setData(prev => ({ ...prev, products: [] })) // ✅ Reset state on error
    } finally {
      setLoadingTab(null)
    }
  }, [productSort])

  const fetchProfitAnalysis = useCallback(async () => {
    try {
      setLoadingTab("profit")
      setError(null)
      const res = await api.get("/analytics/profit-analysis")
      
      // ✅ STRICT VALIDATION: Enforce predictable response structure
      let profitData = res?.data || { products: [], summary: {} }
      if (!profitData.products) profitData.products = []
      if (!profitData.summary) profitData.summary = {}
      if (!Array.isArray(profitData.products)) {
        profitData.products = []
      }
      setData(prev => ({ ...prev, profit: profitData }))
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || "Failed to load profit analysis"
      console.error("[Profit Analysis Error]", { status: err.response?.status, message: errorMsg, fullError: err })
      setError(errorMsg)
      setData(prev => ({ ...prev, profit: { products: [], summary: {} } })) // ✅ Reset state on error
    } finally {
      setLoadingTab(null)
    }
  }, [])

  const fetchSupplierPerformance = useCallback(async () => {
    try {
      setLoadingTab("supplier")
      setError(null)
      const res = await api.get("/analytics/supplier-performance")
      
      // ✅ STRICT VALIDATION: Enforce predictable response structure
      let suppliers = res?.data?.suppliers || res?.data?.data || res?.data || []
      if (!Array.isArray(suppliers)) {
        suppliers = []
      }
      setData(prev => ({ ...prev, supplier: suppliers }))
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || "Failed to load supplier performance"
      console.error("[Supplier Performance Error]", { status: err.response?.status, message: errorMsg, fullError: err })
      setError(errorMsg)
      setData(prev => ({ ...prev, supplier: [] })) // ✅ Reset state on error
    } finally {
      setLoadingTab(null)
    }
  }, [])

  const fetchCategoryAnalysis = useCallback(async () => {
    try {
      setLoadingTab("category")
      setError(null)
      const res = await api.get("/analytics/category-analysis")
      
      // ✅ STRICT VALIDATION: Enforce predictable response structure
      let categories = res?.data?.categories || res?.data?.data || res?.data || []
      if (!Array.isArray(categories)) {
        categories = []
      }
      setData(prev => ({ ...prev, category: categories }))
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || "Failed to load category analysis"
      console.error("[Category Analysis Error]", { status: err.response?.status, message: errorMsg, fullError: err })
      setError(errorMsg)
      setData(prev => ({ ...prev, category: [] })) // ✅ Reset state on error
    } finally {
      setLoadingTab(null)
    }
  }, [])

  const fetchInventoryTurnover = useCallback(async () => {
    try {
      setLoadingTab("turnover")
      setError(null)
      const res = await api.get("/analytics/inventory-turnover")
      
      // ✅ STRICT VALIDATION: Enforce predictable response structure
      let turnover = res?.data?.turnover || res?.data?.data || res?.data || []
      if (!Array.isArray(turnover)) {
        turnover = []
      }
      setData(prev => ({ ...prev, turnover }))
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || "Failed to load inventory turnover"
      console.error("[Inventory Turnover Error]", { status: err.response?.status, message: errorMsg, fullError: err })
      setError(errorMsg)
      setData(prev => ({ ...prev, turnover: [] })) // ✅ Reset state on error
    } finally {
      setLoadingTab(null)
    }
  }, [])

  const fetchPerformanceIndexes = useCallback(async () => {
    const DEFAULT_PERF_DATA = {
      performance_indexes: {
        profitability_index: { score: 0, margin_percent: 0, profitable_products: 0, total_products: 0, status: "-" },
        inventory_health_index: { score: 0, turnover_rate: 0, stock_value: 0, stock_efficiency: 0, status: "-" },
        sales_velocity_index: { score: 0, total_quantity_sold: 0, avg_per_product: 0, status: "-" },
        overall_health_index: { score: 0, status: "-" },
        category_performance: []
      }
    }
    
    try {
      setLoadingTab("performance")
      setError(null)
      const res = await api.get("/analytics/performance-indexes")
      
      // ✅ STRICT VALIDATION: Enforce predictable response structure
      let perfData = res?.data || DEFAULT_PERF_DATA
      if (!perfData.performance_indexes) {
        perfData = DEFAULT_PERF_DATA
      }
      setData(prev => ({ ...prev, performance: perfData }))
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || "Failed to load performance indexes"
      console.error("[Performance Indexes Error]", { status: err.response?.status, message: errorMsg, fullError: err })
      setError(errorMsg)
      setData(prev => ({ ...prev, performance: DEFAULT_PERF_DATA })) // ✅ Reset state on error with defaults
    } finally {
      setLoadingTab(null)
    }
  }, [])

  useEffect(() => {
    // ✅ ROLE CHECK: Allow both admin and manager roles
    if (!user || !["admin", "manager"].includes(user.role)) {
      navigate("/")
      return
    }

    // ✅ OPTIMIZATION: Only fetch active tab data using switch-case (not all tabs)
    switch (activeTab) {
      case "revenue":
        fetchRevenueTrends()
        break
      case "products":
        fetchTopProducts()
        break
      case "profit":
        fetchProfitAnalysis()
        break
      case "supplier":
        fetchSupplierPerformance()
        break
      case "category":
        fetchCategoryAnalysis()
        break
      case "turnover":
        fetchInventoryTurnover()
        break
      case "performance":
        fetchPerformanceIndexes()
        break
      default:
        break
    }
  }, [activeTab, period, productSort, debouncedStartDate, debouncedEndDate, user, navigate, fetchRevenueTrends, fetchTopProducts, fetchProfitAnalysis, fetchSupplierPerformance, fetchCategoryAnalysis, fetchInventoryTurnover, fetchPerformanceIndexes])

  // ========== RENDER FUNCTIONS ==========

  const renderRevenueTab = useCallback(() => {
    return (
  <div className="tab-content">
    <div className="tab-header">
      <h2>📈 Revenue Trends</h2>

      <div className="period-selector">
        <button
          className={period === "daily" ? "active" : ""}
          onClick={() => {
            setPeriod("daily")
          }}
        >
          Daily
        </button>
        <button
          className={period === "weekly" ? "active" : ""}
          onClick={() => {
            setPeriod("weekly")
          }}
        >
          Weekly
        </button>
        <button
          className={period === "monthly" ? "active" : ""}
          onClick={() => {
            setPeriod("monthly")
          }}
        >
          Monthly
        </button>
        <button
          className={period === "yearly" ? "active" : ""}
          onClick={() => {
            setPeriod("yearly")
          }}
        >
          Yearly
        </button>
      </div>

      <div className="date-filter" style={{ marginTop: "15px", display: "flex", gap: "10px", alignItems: "center" }}>
        <label style={{ color: "#94a3b8", fontSize: "14px" }}>From:</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={{
            padding: "8px",
            background: "rgba(30,41,59,0.8)",
            color: "#e2e8f0",
            border: "1px solid rgba(148,163,184,0.3)",
            borderRadius: "4px",
            fontSize: "14px"
          }}
        />
        <label style={{ color: "#94a3b8", fontSize: "14px" }}>To:</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          style={{
            padding: "8px",
            background: "rgba(30,41,59,0.8)",
            color: "#e2e8f0",
            border: "1px solid rgba(148,163,184,0.3)",
            borderRadius: "4px",
            fontSize: "14px"
          }}
        />
        <button
          onClick={() => {
            setStartDate("")
            setEndDate("")
          }}
          style={{
            padding: "8px 12px",
            background: "rgba(75,85,99,0.5)",
            color: "#e2e8f0",
            border: "1px solid rgba(148,163,184,0.3)",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px"
          }}
        >
          Clear
        </button>
      </div>
    </div>

    {loadingTab === "revenue" ? (
      <div className="loading-state">
        <p>Loading chart...</p>
      </div>
    ) : data?.revenue?.length > 0 ? (
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={period === "daily" ? 700 : period === "weekly" ? 600 : period === "yearly" ? 400 : 450}>
          <LineChart
            data={data.revenue}
            margin={{ top: 20, right: 60, left: 60, bottom: period === "daily" ? 100 : period === "weekly" ? 100 : period === "yearly" ? 50 : 100 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148,163,184,0.2)"
            />

            {/* X Axis (time / label) */}
            <XAxis 
              dataKey={period === "daily" ? "_id" : "date_range"} 
              stroke="#94a3b8" 
              angle={period === "daily" ? -45 : period === "yearly" ? 0 : -45}
              textAnchor={period === "daily" ? "end" : period === "yearly" ? "middle" : "end"}
              height={period === "daily" ? 120 : period === "weekly" ? 100 : period === "yearly" ? 30 : 80}
              interval={0}
              tick={{ fontSize: period === "daily" ? 11 : 12 }}
            />

            {/* LEFT Y AXIS → Revenue */}
            <YAxis
              yAxisId="left"
              stroke="#6366f1"
              tickFormatter={(value) => `$${value}`}
            />

            {/* RIGHT Y AXIS → Sales Count */}
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#10b981"
              tickFormatter={(value) => value}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend />

            {/* Revenue Line */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="revenue"
              stroke="#6366f1"
              strokeWidth={3}
              name="Revenue"
              dot={{ r: 5 }}
              activeDot={{ r: 7 }}
            />

            {/* Sales Count Line */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="sales_count"
              stroke="#10b981"
              strokeWidth={3}
              name="Sales Count"
              dot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>

      </div>
    ) : (
      <div className="empty-state">
        <p>No revenue data available</p>
      </div>
    )}
  </div>
    )
}, [period, data.revenue, loadingTab, CustomTooltip])

  const renderTurnoverTab = useCallback(() => (
    <div className="tab-content">
      <h2>🔄 Inventory Turnover</h2>
      {loadingTab === "turnover" ? (
        <div className="loading-state"><p>Loading...</p></div>
      ) : Array.isArray(data.turnover) && data.turnover.length > 0 ? (
        <div className="table-responsive">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Total Sold</th>
                <th>Current Stock</th>
                <th>Reorder Point</th>
                <th>Days in Stock</th>
                <th>Times Sold</th>
                <th>Stock Status</th>
              </tr>
            </thead>
            <tbody>
              {data.turnover.map((item, idx) => (
                <tr key={idx}>
                  <td className="product-name">{item.product_name}</td>
                  <td>{item.total_sold} units</td>
                  <td>{item.current_stock} units</td>
                  <td>{item.reorder_point} units</td>
                  <td>{item.days_in_stock === 999 ? "N/A" : Math.round(item.days_in_stock) + " days"}</td>
                  <td>{item.times_sold}</td>
                  <td>
                    <span className={`badge ${
                      item.stock_status === "High" ? "success" : 
                      item.stock_status === "Medium" ? "warning" : 
                      item.stock_status === "Low" ? "info" :
                      "critical"
                    }`}>
                      {item.stock_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state"><p>No turnover data available</p></div>
      )}
    </div>
  ), [data.turnover, loadingTab])

  const renderPerformanceTab = useCallback(() => {
    const indexes = data.performance?.performance_indexes || {}
    const profIndex = indexes.profitability_index || {}
    const invIndex = indexes.inventory_health_index || {}
    const salesIndex = indexes.sales_velocity_index || {}
    const healthIndex = indexes.overall_health_index || {}
    const categoryPerf = indexes.category_performance || []

    const getStatusColor = (status) => {
      if (typeof status === 'number') {
        return status >= 70 ? '#10b981' : status >= 50 ? '#f59e0b' : '#ef4444'
      }
      const lowerStatus = status?.toLowerCase() || ''
      if (lowerStatus.includes('good') || lowerStatus.includes('healthy') || lowerStatus.includes('strong')) return '#10b981'
      if (lowerStatus.includes('fair') || lowerStatus.includes('moderate')) return '#f59e0b'
      return '#ef4444'
    }

    const renderGauge = (score, title, status) => (
      <div className="index-card" style={{ borderLeft: `4px solid ${getStatusColor(score)}` }}>
        <h4>{title}</h4>
        <div className="gauge-container">
          <div className="gauge-score">{score}</div>
          <div className="gauge-label">/100</div>
        </div>
        <div className="status-label" style={{ color: getStatusColor(status) }}>{status}</div>
      </div>
    )

    return (
      <div className="tab-content">
        <h2>📊 Performance Indexes Dashboard</h2>
        {loadingTab === "performance" ? (
          <div className="loading-state"><p>Loading...</p></div>
        ) : Object.keys(indexes).length > 0 ? (
          <>
            {/* OVERALL HEALTH SCORECARD */}
            <div className="overall-scorecard" style={{
              padding: '20px', 
              backgroundColor: 'rgba(16, 185, 129, 0.1)', 
              borderRadius: '8px',
              marginBottom: '20px',
              border: '2px solid #10b981'
            }}>
              <h3>🎯 Overall Business Health</h3>
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#10b981', marginTop: '10px' }}>
                {healthIndex.score}/100
              </div>
              <p style={{ color: '#10b981', marginTop: '5px' }}>Status: {healthIndex.status}</p>
            </div>

            {/* STRATEGIC INDEXES */}
            <div className="section-header"><h3>Core Performance Indexes</h3></div>
            <div className="indexes-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '30px' }}>
              {renderGauge(profIndex.score, "💰 Profitability Index", profIndex.status)}
              {renderGauge(invIndex.score, "📦 Inventory Health", invIndex.status)}
              {renderGauge(salesIndex.score, "📈 Sales Velocity", salesIndex.status)}
            </div>

            {/* DETAILED INDEX METRICS */}
            <div className="section-header"><h3>Index Details</h3></div>
            <div className="metrics-grid">
              <div className="metric-card">
                <h4>💰 Profitability Analysis</h4>
                <div className="metric-row" style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}>
                  <span>Score:</span>
                  <strong style={{ fontSize: '18px', color: profIndex.score >= 70 ? '#10b981' : profIndex.score >= 50 ? '#f59e0b' : '#ef4444' }}>
                    {profIndex.score}/100
                  </strong>
                </div>
                <div className="metric-row" style={{ marginBottom: '12px' }}>
                  <span>Status:</span>
                  <strong style={{ 
                    color: profIndex.status === 'Good' ? '#10b981' : profIndex.status === 'Fair' ? '#f59e0b' : '#ef4444',
                    textTransform: 'uppercase',
                    fontSize: '12px'
                  }}>
                    {profIndex.status}
                  </strong>
                </div>
                <div className="metric-row">
                  <span>Overall Margin:</span>
                  <strong style={{ color: profIndex.margin_percent >= 0 ? '#10b981' : '#ef4444' }}>
                    {profIndex.margin_percent}%
                  </strong>
                </div>
                <div className="metric-row">
                  <span>Profitable Products:</span>
                  <strong>{profIndex.profitable_products}/{profIndex.total_products}</strong>
                </div>
              </div>

              <div className="metric-card">
                <h4>📦 Inventory Efficiency</h4>
                <div className="metric-row" style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}>
                  <span>Score:</span>
                  <strong style={{ fontSize: '18px', color: invIndex.score >= 70 ? '#10b981' : invIndex.score >= 50 ? '#f59e0b' : '#ef4444' }}>
                    {invIndex.score}/100
                  </strong>
                </div>
                <div className="metric-row" style={{ marginBottom: '12px' }}>
                  <span>Status:</span>
                  <strong style={{ 
                    color: invIndex.status === 'Healthy' ? '#10b981' : invIndex.status === 'Moderate' ? '#f59e0b' : '#ef4444',
                    textTransform: 'uppercase',
                    fontSize: '12px'
                  }}>
                    {invIndex.status}
                  </strong>
                </div>
                <div className="metric-row">
                  <span>Turnover Rate:</span>
                  <strong>{invIndex.turnover_rate}x</strong>
                </div>
                <div className="metric-row">
                  <span>Stock Value:</span>
                  <strong>${invIndex.stock_value}</strong>
                </div>
                <div className="metric-row">
                  <span>Stock Efficiency Ratio:</span>
                  <strong>{invIndex.stock_efficiency}</strong>
                </div>
                {invIndex.stock_health_breakdown && (
                  <>
                    <div className="metric-row" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(148, 163, 184, 0.2)' }}>
                      <span>🟢 Healthy Stock:</span>
                      <strong>{invIndex.stock_health_breakdown.healthy}/{invIndex.stock_health_breakdown.total}</strong>
                    </div>
                    <div className="metric-row">
                      <span>🟡 Medium Stock:</span>
                      <strong>{invIndex.stock_health_breakdown.medium}/{invIndex.stock_health_breakdown.total}</strong>
                    </div>
                    <div className="metric-row">
                      <span>🔵 Low Stock:</span>
                      <strong>{invIndex.stock_health_breakdown.low}/{invIndex.stock_health_breakdown.total}</strong>
                    </div>
                    {invIndex.stock_health_breakdown.critical > 0 && (
                      <div className="metric-row" style={{ color: '#ef4444', fontWeight: 'bold' }}>
                        <span>🔴 Critical Stock:</span>
                        <strong>{invIndex.stock_health_breakdown.critical}/{invIndex.stock_health_breakdown.total}</strong>
                      </div>
                    )}
                    <div className="metric-row" style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(148, 163, 184, 0.1)', color: '#cbd5e1', fontSize: '12px' }}>
                      <span>Health %:</span>
                      <strong>{invIndex.stock_health_breakdown.healthy_percentage}%</strong>
                    </div>
                  </>
                )}
                {(invIndex.avg_age_penalty_per_product ?? 0) > 0 && (
                  <div className="metric-row" style={{ color: '#f59e0b', fontWeight: 'bold', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(148, 163, 184, 0.2)' }}>
                    <span>⚠️ Stock Age Penalty:</span>
                    <strong>-{invIndex.avg_age_penalty_per_product} pts</strong>
                  </div>
                )}
              </div>

              <div className="metric-card">
                <h4>📈 Sales Performance</h4>
                <div className="metric-row" style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}>
                  <span>Score:</span>
                  <strong style={{ fontSize: '18px', color: salesIndex.score >= 70 ? '#10b981' : salesIndex.score >= 50 ? '#f59e0b' : '#ef4444' }}>
                    {Math.round(salesIndex.score)}/100
                  </strong>
                </div>
                <div className="metric-row" style={{ marginBottom: '12px' }}>
                  <span>Status:</span>
                  <strong style={{ 
                    color: salesIndex.status === 'Strong' ? '#10b981' : salesIndex.status === 'Moderate' ? '#f59e0b' : '#ef4444',
                    textTransform: 'uppercase',
                    fontSize: '12px'
                  }}>
                    {salesIndex.status}
                  </strong>
                </div>
                <div className="metric-row">
                  <span>Total Units Sold:</span>
                  <strong>{salesIndex.total_quantity_sold}</strong>
                </div>
                <div className="metric-row">
                  <span>Avg Per Product:</span>
                  <strong>{salesIndex.avg_per_product}</strong>
                </div>
              </div>
            </div>

            {/* CATEGORY PERFORMANCE COMPARISON */}
            <div className="section-header"><h3>Category Performance Comparison</h3></div>
            <div className="matrix-table-wrapper">
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Profitability %</th>
                    <th>Products</th>
                    <th>Profitable</th>
                    <th>Stock Status Penalty</th>
                    <th>Health Status</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryPerf.map((cat, idx) => (
                    <tr key={idx}>
                      <td><strong>{cat.category}</strong></td>
                      <td style={{ color: cat.profitability >= 0 ? '#10b981' : '#ef4444' }}>
                        {cat.profitability.toFixed(1)}%
                      </td>
                      <td>{cat.productCount}</td>
                      <td>{cat.profitableCount}/{cat.productCount}</td>
                      <td style={{
                        fontWeight: 'bold',
                        color: cat.agingIndex <= 5 ? '#10b981' : cat.agingIndex <= 15 ? '#f59e0b' : '#ef4444'
                      }} title="Total stock status penalty (Critical: 5pts, Low: 3pts, Medium: 1pt)">
                        {cat.agingIndex} pts
                        <div style={{ fontSize: '11px', fontWeight: 'normal', marginTop: '2px', color: '#cbd5e1' }}>
                          (Avg: {(cat.avgAgePenalty || 0).toFixed(2)} pts/product)
                        </div>
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: cat.healthStatus === 'Healthy' ? '#d1fae5' : '#fef3c7',
                          color: cat.healthStatus === 'Healthy' ? '#065f46' : '#92400e'
                        }}>
                          {cat.healthStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="empty-state"><p>No performance data available</p></div>
        )}
      </div>
    )
  }, [data.performance, loadingTab])

  const renderProductsTab = useCallback(() => (
    <div className="tab-content">
      <div className="tab-header">
        <h2>🏆 Top Products</h2>
        <div className="period-selector">
          <button
            className={productSort === "revenue" ? "active" : ""}
            onClick={() => setProductSort("revenue")}
          >
            By Revenue
          </button>
          <button
            className={productSort === "quantity" ? "active" : ""}
            onClick={() => setProductSort("quantity")}
          >
            By Quantity
          </button>
        </div>
      </div>
      {loadingTab === "products" ? (
        <div className="loading-state"><p>Loading...</p></div>
      ) : Array.isArray(data.products) && data.products.length > 0 ? (
        <>
          <div className="chart-container">
            <h3>{productSort === "revenue" ? "Products by Revenue - Performance Metrics" : "Products by Quantity - Performance Metrics"} (Top 5)</h3>
            <ResponsiveContainer width="100%" height={450}>
              <BarChart data={data.products.slice(0, 5)} margin={{ top: 20, right: 80, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                <XAxis dataKey="product_name" angle={-45} textAnchor="end" height={100} stroke="#94a3b8" />
                
                {/* LEFT Y AXIS → Revenue */}
                <YAxis yAxisId="left" stroke="#6366f1" label={{ value: "Revenue ($)", angle: -90, position: "insideLeft" }} />
                
                {/* CENTER Y AXIS → Quantity */}
                <YAxis yAxisId="center" orientation="right" stroke="#10b981" label={{ value: "Quantity (units)", angle: 90, position: "insideRight" }} />
                
                {/* RIGHT Y AXIS → Unit Price */}
                <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" label={{ value: "Unit Price ($)", angle: -90, position: "outside", dx: 60 }} />
                
                <Tooltip 
                  contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(148,163,184,0.2)" }}
                  formatter={(value, name) => {
                    if (name === "Revenue") return `$${value.toFixed(2)}`
                    if (name === "Unit Price") return `$${value.toFixed(2)}`
                    return `${value} units`
                  }}
                />
                <Legend />
                
                <Bar yAxisId="left" dataKey="total_revenue" fill="#6366f1" name="Revenue" label={{ position: "top", formatter: (value) => `$${Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}`, fill: "#ffffff", fontSize: 11, fontWeight: "bold" }} />
                <Bar yAxisId="center" dataKey="total_quantity" fill="#10b981" name="Quantity" label={{ position: "top", formatter: (value) => `${value}`, fill: "#ffffff", fontSize: 11, fontWeight: "bold" }} />
                <Bar yAxisId="right" dataKey="unit_price" fill="#f59e0b" name="Unit Price" label={{ position: "top", formatter: (value) => `$${value.toFixed(2)}`, fill: "#ffffff", fontSize: 11, fontWeight: "bold" }} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="metrics-grid">
            {data.products.slice(0, 9).map((product, idx) => (
              <div key={idx} className="metric-card">
                <h4>{product.product_name}</h4>
                <div className="metric-row">
                  <span>Revenue:</span>
                  <strong>${product.total_revenue.toFixed(2)}</strong>
                </div>
                <div className="metric-row">
                  <span>Quantity:</span>
                  <strong>{product.total_quantity} units</strong>
                </div>
                <div className="metric-row">
                  <span>Avg Price:</span>
                  <strong>${product.unit_price.toFixed(2)}</strong>
                </div>
                <div className="metric-row">
                  <span>Sales:</span>
                  <strong>{product.sales_count} times</strong>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state"><p>No product data available</p></div>
      )}
    </div>
  ), [data.products, loadingTab, productSort])

  const renderProfitTab = useCallback(() => (
    <div className="tab-content">
      <h2>💸 Profit Analysis</h2>
      {loadingTab === "profit" ? (
        <div className="loading-state"><p>Loading...</p></div>
      ) : Array.isArray(data.profit?.products) && data.profit.products.length > 0 ? (
        <>
          <div className="summary-cards">
            <div className="summary-card">
              <p className="label">Total Profit</p>
              <p className="value">${data.profit.summary.total_profit?.toFixed(2) || 0}</p>
            </div>
            <div className="summary-card">
              <p className="label">Total Revenue</p>
              <p className="value">${data.profit.summary.total_revenue?.toFixed(2) || 0}</p>
            </div>
            <div className="summary-card">
              <p className="label">Overall Margin</p>
              <p className="value">{data.profit.summary.overall_margin?.toFixed(2) || 0}%</p>
            </div>
          </div>

          <div className="chart-container">
            <ResponsiveContainer width="100%" height={450}>
              <BarChart data={data.profit.products.slice(0, 5)} margin={{ top: 50, right: 30, left:30, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                <XAxis dataKey="product_name" angle={-45} textAnchor="end" height={100} stroke="#94a3b8" />
                <YAxis yAxisId="left" stroke="#6366f1" label={{ value: "Revenue ($)", angle: -90, position: "insideLeft" }} />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" label={{ value: "Profit ($)", angle: 90, position: "insideRight" }} />
                <Tooltip 
                  contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(148,163,184,0.2)" }}
                  formatter={(value) => `$${value.toFixed(2)}`}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="total_revenue" fill="#6366f1" name="Revenue" label={{ position: "top", formatter: (value) => `$${(value/1000).toFixed(1)}K`, fill: "#ffffff", fontSize: 11, fontWeight: "bold" }} />
                <Bar yAxisId="right" dataKey="total_profit" fill="#10b981" name="Profit" label={{ position: "top", formatter: (value) => `$${(value/1000).toFixed(1)}K`, fill: "#ffffff", fontSize: 11, fontWeight: "bold" }} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="metrics-grid">
            {data.profit.products.slice(0, 9).map((product, idx) => (
              <div key={idx} className="metric-card">
                <h4>{product.product_name}</h4>
                <div className="metric-row">
                  <span>Revenue:</span>
                  <strong>${product.total_revenue.toFixed(2)}</strong>
                </div>
                <div className="metric-row">
                  <span>Cost:</span>
                  <strong>${product.total_cost.toFixed(2)}</strong>
                </div>
                <div className="metric-row">
                  <span>Profit:</span>
                  <strong className="profit">${product.total_profit.toFixed(2)}</strong>
                </div>
                <div className="metric-row">
                  <span>Margin:</span>
                  <strong>{product.profit_margin?.toFixed(2) || 0}%</strong>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state"><p>No profit data available</p></div>
      )}
    </div>
  ), [data.profit, loadingTab])

  const renderCategoryTab = useCallback(() => (
    <div className="tab-content">
      <h2>📦 Category Analysis</h2>
      {loadingTab === "category" ? (
        <div className="loading-state"><p>Loading...</p></div>
      ) : Array.isArray(data.category) && data.category.length > 0 ? (
        <>
          <div className="charts-row">
            <div className="chart-container half">
              <h3>Revenue by Category</h3>
              <ResponsiveContainer width="100%" height={500}>
                <PieChart>
                  <Pie
                    data={data.category.slice(0, 9)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => {
                      const categoryName = entry.category || 'Undefined'
                      const revenue = entry.total_revenue
                      return `${categoryName}: $${revenue}`
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="total_revenue"
                  >
                    {data.category.slice(0, 9).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-container half">
              <h3>Category Performance - Revenue vs Quantity</h3>
              <ResponsiveContainer width="100%" height={500}>
                <BarChart data={data.category.slice(0, 5).map(item => ({ ...item, category: item.category || 'Undefined' }))} margin={{ top: 50, right: 30, left: 30, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                  <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} stroke="#94a3b8" />
                  <YAxis yAxisId="left" stroke="#94a3b8" label={{ value: "Revenue ($)", angle: -90, position: "insideLeft" }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" label={{ value: "Quantity Sold", angle: 90, position: "insideRight" }} />
                  
                  <Tooltip 
                    contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(148,163,184,0.2)" }}
                    formatter={(value) => value}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="total_revenue" fill="#6366f1" name="Revenue" label={{ position: "top", formatter: (value) => `$${(value/1000).toFixed(1)}K`, fill: "#ffffff", fontSize: 11, fontWeight: "bold" }} />
                  <Bar yAxisId="right" dataKey="total_quantity" fill="#10b981" name="Quantity Sold" label={{ position: "top", formatter: (value) => `${value}`, fill: "#ffffff", fontSize: 11, fontWeight: "bold" }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="metrics-grid">
            {data.category.slice(0, 9).sort((a, b) => {
              const nameA = (a.category || 'Undefined').toLowerCase()
              const nameB = (b.category || 'Undefined').toLowerCase()
              return nameA.localeCompare(nameB)
            }).map((cat, idx) => (
              <div key={idx} className="metric-card">
                <h4>{cat.category || 'Undefined'}</h4>
                <div className="metric-row">
                  <span>Revenue:</span>
                  <strong>${cat.total_revenue.toFixed(2)}</strong>
                </div>
                <div className="metric-row">
                  <span>Profit:</span>
                  <strong className="profit">${cat.profit.toFixed(2)}</strong>
                </div>
                <div className="metric-row">
                  <span>Quantity:</span>
                  <strong>{cat.total_quantity} units</strong>
                </div>
                <div className="metric-row">
                  <span>Margin:</span>
                  <strong>{cat.profit_margin?.toFixed(2) || 0}%</strong>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state"><p>No category data available</p></div>
      )}
    </div>
  ), [data.category, loadingTab])

  const renderSupplierTab = useCallback(() => (
    <div className="tab-content">
      <h2>🤝 Supplier Performance</h2>
      {loadingTab === "supplier" ? (
        <div className="loading-state"><p>Loading...</p></div>
      ) : Array.isArray(data.supplier) && data.supplier.length > 0 ? (
        <div className="table-responsive">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Total Orders</th>
                <th>Total Spent</th>
                <th>Completed</th>
                <th>On-Time Rate</th>
                <th>Reliability Score</th>
              </tr>
            </thead>
            <tbody>
              {data.supplier.map((supplier, idx) => (
                <tr key={idx}>
                  <td className="supplier-name">{supplier.supplier_name}</td>
                  <td>{supplier.total_orders}</td>
                  <td className="revenue">${supplier.total_spent.toFixed(2)}</td>
                  <td>{supplier.completed_orders}</td>
                  <td>
                    <span className="badge success">{supplier.on_time_rate.toFixed(1)}%</span>
                  </td>
                  <td>
                    <span className={`badge ${supplier.reliability_score >= 90 ? "success" : supplier.reliability_score >= 70 ? "warning" : "danger"}`}>
                      {supplier.reliability_score.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state"><p>No supplier data available</p></div>
      )}
    </div>
  ), [data.supplier, loadingTab])

  return (
    <div className="advanced-analytics-container">
      {error && (
        <div className="error-banner">
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="analytics-header">
        <h1>📊<span className="gradient-text"> Advanced Analytics</span></h1>
        <p>In-depth business performance insights and metrics</p>
      </div>

      <div className="tabs-container">
        <div className="tabs-nav">
          <button
            className={`tab-button ${activeTab === "revenue" ? "active" : ""}`}
            onClick={() => setActiveTab("revenue")}
          >
            📈 Revenue Trends
          </button>
          <button
            className={`tab-button ${activeTab === "products" ? "active" : ""}`}
            onClick={() => setActiveTab("products")}
          >
            🏆 Top Products
          </button>
          <button
            className={`tab-button ${activeTab === "profit" ? "active" : ""}`}
            onClick={() => setActiveTab("profit")}
          >
            💸 Profit Analysis
          </button>
          <button
            className={`tab-button ${activeTab === "category" ? "active" : ""}`}
            onClick={() => setActiveTab("category")}
          >
            📦 Categories
          </button>
          <button
            className={`tab-button ${activeTab === "supplier" ? "active" : ""}`}
            onClick={() => setActiveTab("supplier")}
          >
            🤝 Suppliers
          </button>
          <button
            className={`tab-button ${activeTab === "turnover" ? "active" : ""}`}
            onClick={() => setActiveTab("turnover")}
          >
            🔄 Turnover
          </button>
          <button
            className={`tab-button ${activeTab === "performance" ? "active" : ""}`}
            onClick={() => setActiveTab("performance")}
          >
            📊 Performance Matrix
          </button>
        </div>

        <div className="tabs-content">
          {activeTab === "revenue" && renderRevenueTab()}
          {activeTab === "products" && renderProductsTab()}
          {activeTab === "profit" && renderProfitTab()}
          {activeTab === "category" && renderCategoryTab()}
          {activeTab === "supplier" && renderSupplierTab()}
          {activeTab === "turnover" && renderTurnoverTab()}
          {activeTab === "performance" && renderPerformanceTab()}
        </div>
      </div>
    </div>
  )
}

export default AdvancedAnalytics
