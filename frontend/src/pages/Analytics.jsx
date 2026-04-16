import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import api from "../services/apiClient"
import "../styles/analytics.css"

function Analytics() {
  const navigate = useNavigate()
  const [user, setUser] = useState(() => {
    const rawUser = localStorage.getItem("user")
    return rawUser ? JSON.parse(rawUser) : null
  })

  const [analyticsData, setAnalyticsData] = useState({
    today_revenue: 0,
    revenue_change_percentage: 0,
    top_product: null,
    low_stock_alerts: [],
    recent_sales: []
  })

  const [loading, setLoading] = useState(true)
  const [timeFilter, setTimeFilter] = useState("today") // today, week, month, year
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/")
      return
    }

    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await api.get(`/analytics/overview?timeFilter=${timeFilter}`)
        // Handle different response structures
        const data = res?.data || res || {
          today_revenue: 0,
          revenue_change_percentage: 0,
          top_product: null,
          low_stock_alerts: [],
          recent_sales: []
        }
        console.log('📊 Analytics data fetched:', data)
        setAnalyticsData(data)
      } catch (err) {
        console.error("Error fetching analytics:", err)
        setError("Failed to load analytics data")
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate("/")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [navigate, user, timeFilter])

  if (loading) {
    return (
      <div className="analytics-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading analytics data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="analytics-container">
        <div className="error-message">
          <p>⚠️ {error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="analytics-container">
      {/* HEADER */}
      <div className="analytics-header">
        <div>
          <h1>📊<span className="gradient-text"> Analytics Dashboard</span></h1>
          <p>Comprehensive business performance metrics</p>
        </div>
        <div className="time-filters">
          <button 
            className={timeFilter === "today" ? "active" : ""} 
            onClick={() => setTimeFilter("today")}
          >
            Today
          </button>
          <button 
            className={timeFilter === "week" ? "active" : ""} 
            onClick={() => setTimeFilter("week")}
          >
            This Week
          </button>
          <button 
            className={timeFilter === "month" ? "active" : ""} 
            onClick={() => setTimeFilter("month")}
          >
            This Month
          </button>
          <button 
            className={timeFilter === "year" ? "active" : ""} 
            onClick={() => setTimeFilter("year")}
          >
            This Year
          </button>
        </div>
      </div>

      {/* KEY METRICS */}
      <div className="kpi-grid">
        {/* Revenue Card */}
        <div className="kpi-card revenue-card">
          <div className="kpi-icon">💰</div>
          <div className="kpi-content">
            <p className="kpi-label">{timeFilter === "today" ? "Today's" : timeFilter === "week" ? "This Week's" : timeFilter === "month" ? "This Month's" : "This Year's"} Revenue</p>
            <p className="kpi-value">
              ${(analyticsData.today_revenue || 0).toFixed(2)}
            </p>
            <p className="kpi-change" style={{color: analyticsData.revenue_change_percentage >= 0 ? '#22c55e' : '#ef4444'}}>
              {analyticsData.revenue_change_percentage >= 0 ? '+' : ''}{analyticsData.revenue_change_percentage}% from previous period
            </p>
          </div>
        </div>

        {/* Top Product Card */}
        <div className="kpi-card product-card">
          <div className="kpi-icon">📦</div>
          <div className="kpi-content">
            <p className="kpi-label">Top Product</p>
            <p className="kpi-value">
              {analyticsData.top_product?.name || "N/A"}
            </p>
            <p className="kpi-change">
              {analyticsData.top_product?.quantity_sold || 0} units sold
            </p>
          </div>
        </div>

        {/* Low Stock Alerts Card */}
        <div className="kpi-card alert-card">
          <div className="kpi-icon">⚠️</div>
          <div className="kpi-content">
            <p className="kpi-label">Low Stock Items</p>
            <p className="kpi-value">
              {analyticsData.low_stock_alerts?.length || 0}
            </p>
            <p className="kpi-change">Items below reorder point</p>
          </div>
        </div>

        {/* Total Sales Card */}
        <div className="kpi-card sales-card">
          <div className="kpi-icon">📈</div>
          <div className="kpi-content">
            <p className="kpi-label">Total Sales Today</p>
            <p className="kpi-value">
              {analyticsData.recent_sales?.length || 0}
            </p>
            <p className="kpi-change">transactions</p>
          </div>
        </div>
      </div>

      {/* SECTION: LOW STOCK ALERTS */}
      <div className="analytics-section">
        <div className="section-header">
          <h2>🚨 Low Stock Alerts</h2>
          <span className="alert-badge">{analyticsData.low_stock_alerts?.length || 0}</span>
        </div>
        
        {analyticsData.low_stock_alerts && analyticsData.low_stock_alerts.length > 0 ? (
          <div className="alerts-grid">
            {analyticsData.low_stock_alerts.slice(0, 6).map((product) => (
              <div key={product._id} className="alert-item">
                <div className="alert-header">
                  <h4>{product.product_name || "Unknown Product"}</h4>
                  <span className="stock-status">⚠️ Critical</span>
                </div>
                <div className="alert-details">
                  <div className="detail-row">
                    <span>Current Stock:</span>
                    <strong>{product.current_stock}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Reorder Point:</span>
                    <strong>{product.reorder_point}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Shortage:</span>
                    <strong className="shortage">
                      {product.reorder_point - product.current_stock} units
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>✅ All items are well-stocked! No alerts at this time.</p>
          </div>
        )}
      </div>

      {/* SECTION: RECENT SALES */}
      <div className="analytics-section">
        <div className="section-header">
          <h2>💳 Recent Sales Transactions</h2>
          <span className="count-badge">{analyticsData.recent_sales?.length || 0}</span>
        </div>

        {analyticsData.recent_sales && analyticsData.recent_sales.length > 0 ? (
          <div className="sales-table">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Revenue</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.recent_sales.map((sale) => (
                  <tr key={sale._id}>
                    <td className="product-name">{sale.product_name}</td>
                    <td>{sale.quantity_sold} units</td>
                    <td className="revenue">${(sale.revenue || 0).toFixed(2)}</td>
                    <td className="date">
                      {new Date(sale.createdAt || Date.now()).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>No sales recorded yet.</p>
          </div>
        )}
      </div>

      {/* SECTION: ANALYTICS SUMMARY */}
      <div className="analytics-section">
        <div className="section-header">
          <h2>📋 Performance Summary</h2>
        </div>
        <div className="summary-grid">
          <div className="summary-card">
            <h4>Total Revenue (Today)</h4>
            <p className="summary-value">${(analyticsData.today_revenue || 0).toFixed(2)}</p>
            <div className="progress-bar">
              <div className="progress" style={{ width: "75%" }}></div>
            </div>
          </div>
          <div className="summary-card">
            <h4>Average Order Value</h4>
            <p className="summary-value">
              $
              {analyticsData.recent_sales?.length > 0
                ? (
                    analyticsData.recent_sales.reduce((sum, sale) => sum + (sale.revenue || 0), 0) /
                    analyticsData.recent_sales.length
                  ).toFixed(2)
                : "0.00"}
            </p>
            <div className="progress-bar">
              <div className="progress" style={{ width: "60%" }}></div>
            </div>
          </div>
          <div className="summary-card">
            <h4>Inventory Health</h4>
            <p className="summary-value">
              {analyticsData.low_stock_alerts?.length === 0 ? "✅ Good" : "⚠️ Needs Attention"}
            </p>
            <div className="progress-bar">
              <div className="progress" style={{ 
                width: analyticsData.low_stock_alerts?.length === 0 ? "100%" : "40%",
                backgroundColor: analyticsData.low_stock_alerts?.length === 0 ? "#10b981" : "#ef4444"
              }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics
