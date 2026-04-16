import React, { useState, useEffect } from 'react';
import api from '../services/apiClient';
import '../styles/salesDashboard.css';

const SalesDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sales/dashboard');
      setDashboardData(response.data.data);
      setError(null);
    } catch (err) {
      console.error('❌ Error fetching dashboard data:', err);
      setError('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num || 0);
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>❌ {error}</p>
        <button onClick={fetchDashboardData} className="retry-btn">
          🔄 Retry
        </button>
      </div>
    );
  }

  if (!dashboardData) {
    return <div className="dashboard-no-data">No dashboard data available</div>;
  }

  const { recent_sales, top_products_by_revenue, low_stock_items } = dashboardData;

  return (
    <div className="sales-dashboard">
      {/* Revenue Summary Cards */}
      <div className="dashboard-cards">
        <div className="dashboard-card revenue-card">
          <div className="card-header">
            <h3>💰 Total Revenue</h3>
            <span className="time-period">Last 30 Days</span>
          </div>
          <div className="card-content">
            <div className="main-metric">
              {formatCurrency(recent_sales.total_revenue_30_days)}
            </div>
            <div className="sub-metrics">
              <div className="sub-metric">
                <span className="label">Total Orders:</span>
                <span className="value">{formatNumber(recent_sales.total_orders_30_days)}</span>
              </div>
              <div className="sub-metric">
                <span className="label">Avg Order Value:</span>
                <span className="value">{formatCurrency(recent_sales.average_order_value)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-card weekly-card">
          <div className="card-header">
            <h3>📈 Weekly Revenue</h3>
            <span className="time-period">Last 7 Days</span>
          </div>
          <div className="card-content">
            <div className="main-metric">
              {formatCurrency(recent_sales.weekly_revenue)}
            </div>
            <div className="growth-indicator">
              {recent_sales.weekly_revenue > 0 ? '📊 Active sales this week' : '📉 No sales this week'}
            </div>
          </div>
        </div>
      </div>

      {/* Top Products Section */}
      <div className="dashboard-section">
        <div className="section-header">
          <h3>🏆 Top Products by Revenue</h3>
          <span className="section-subtitle">Last 30 days performance</span>
        </div>
        <div className="top-products-list">
          {top_products_by_revenue && top_products_by_revenue.length > 0 ? (
            top_products_by_revenue.map((product, index) => (
              <div key={product._id} className="product-item">
                <div className="product-rank">#{index + 1}</div>
                <div className="product-info">
                  <div className="product-name">{product.product_name}</div>
                  <div className="product-details">
                    <span className="sku">SKU: {product.product_sku}</span>
                    <span className="category">{product.category}</span>
                  </div>
                </div>
                <div className="product-metrics">
                  <div className="revenue">{formatCurrency(product.total_revenue)}</div>
                  <div className="quantity">
                    {formatNumber(product.total_quantity_sold)} units sold
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-data">
              📭 No sales data available for the last 30 days
            </div>
          )}
        </div>
      </div>

      {/* Low Stock Items Section */}
      <div className="dashboard-section">
        <div className="section-header">
          <h3>⚠️ Low Stock Alert</h3>
          <span className="section-subtitle">Items below reorder point</span>
        </div>
        <div className="low-stock-list">
          {low_stock_items && low_stock_items.length > 0 ? (
            low_stock_items.map((item) => (
              <div key={item._id} className="stock-item">
                <div className="item-info">
                  <div className="item-name">{item.name}</div>
                  <div className="item-details">
                    <span className="sku">SKU: {item.sku}</span>
                    <span className="category">{item.category}</span>
                  </div>
                </div>
                <div className="stock-metrics">
                  <div className="current-stock">
                    <span className="label">Current:</span>
                    <span className={`value ${item.current_stock === 0 ? 'out-of-stock' : 'low-stock'}`}>
                      {item.current_stock}
                    </span>
                  </div>
                  <div className="reorder-point">
                    <span className="label">Reorder at:</span>
                    <span className="value">{item.reorder_point}</span>
                  </div>
                  <div className="shortage">
                    <span className="label">Need:</span>
                    <span className="value shortage-amount">
                      {item.stock_shortage} units
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="no-data">
              ✅ All items are well stocked
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesDashboard;