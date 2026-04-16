import React, { useState, useEffect } from "react";
import api from "../services/apiClient";
import "../styles/inventory.css";
import "../styles/lowStock.css";

const Inventory = () => {
  const [currentUser] = useState(() => {
    try {
      const rawUser = localStorage.getItem("user");
      return rawUser ? JSON.parse(rawUser) : null;
    } catch (error) {
      console.error("Error parsing user from localStorage:", error);
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState("transactions");
  const [transactions, setTransactions] = useState([]);
  const [variances, setVariances] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    transactionType: "",
    days: 30,
    status: ""
  });
  const [approvalNotes, setApprovalNotes] = useState("");
  const [approvingTxnId, setApprovingTxnId] = useState(null);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showVarianceModal, setShowVarianceModal] = useState(false);
  const [summary, setSummary] = useState([]);
  const [turnover, setTurnover] = useState([]);
  const [products, setProducts] = useState([]);
  const [adjustmentForm, setAdjustmentForm] = useState({
    product_id: "",
    quantity_change: "",
    reason: "",
    notes: ""
  });
  const [varianceForm, setVarianceForm] = useState({
    product_id: "",
    physical_count: ""
  });
  const [varianceStatusFilter, setVarianceStatusFilter] = useState("");
  const isAdmin = currentUser?.role === "admin";

  // Fetch inventory transactions
  useEffect(() => {
    if (activeTab === "transactions") {
      fetchTransactions();
    }
  }, [activeTab, filters]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (filters.transactionType) query.append("transaction_type", filters.transactionType);
      if (filters.days) query.append("days", filters.days);
      if (filters.status) query.append("status", filters.status);

      const res = await api.get(`/inventory/transactions?${query}`);
      setTransactions(res.data.data || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get("/products");
      setProducts(res.data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  // Fetch stock variances
  const fetchVariances = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (varianceStatusFilter) query.append("status", varianceStatusFilter);
      const queryString = query.toString();
      const res = await api.get(`/inventory/variances${queryString ? `?${queryString}` : ""}`);
      setVariances(res.data.data || []);
    } catch (error) {
      console.error("Error fetching variances:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch low stock alerts
  const fetchAlerts = async () => {
    try {
      setLoading(true);
      console.log("Fetching low stock alerts...");
      
      // First call the direct endpoint to create alerts if needed
      const directRes = await api.get(`/inventory/low-stock-direct`);
      console.log("Direct low stock response:", directRes.data);
      
      // Then fetch the actual alerts
      const res = await api.get(`/inventory/alerts`);
      console.log("Alerts API response:", res.data);
      console.log("Alert objects details:", res.data.data?.map(alert => ({
        name: alert.product_name,
        supplier_id: alert.preferred_supplier_id,
        supplier_name: alert.preferred_supplier_id?.name
      })));
      setAlerts(res.data.data || []);
      console.log("Set alerts state:", res.data.data || []);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch inventory summary
  const fetchSummary = async () => {
    try {
      const res = await api.get(`/inventory/summary`);
      console.log("Inventory summary response:", res.data);
      setSummary(res.data.data || []);
      if (res.data.data) {
        res.data.data.forEach((cat, index) => {
          console.log(`Category ${index + 1}: ${cat._id} - Total Stock: ${cat.total_stock}, Low Stock Items: ${cat.low_stock_items}`);
        });
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
    }
  };

  // Fetch turnover metrics
  const fetchTurnover = async () => {
    try {
      const res = await api.get(`/inventory/turnover?days=30`);
      setTurnover(res.data.data || []);
    } catch (error) {
      console.error("Error fetching turnover:", error);
    }
  };

  useEffect(() => {
    if (activeTab === "variances") fetchVariances();
  }, [activeTab, varianceStatusFilter]);

  useEffect(() => {
    fetchProducts();

    if (activeTab === "alerts") fetchAlerts();
    if (activeTab === "analytics") {
      fetchSummary();
      fetchTurnover();
    }
  }, [activeTab]);

  // Listen for inventory updates from other components (like PO delivery)
  useEffect(() => {
    const handleInventoryUpdate = (event) => {
      console.log("Inventory updated event received:", event.detail);
      console.log("Refreshing inventory data due to external update...");
      
      // Refresh alerts if on alerts tab
      if (activeTab === "alerts") {
        fetchAlerts();
      }
      
      // Always refresh summary data as stock levels may have changed
      fetchSummary();
    };
    
    window.addEventListener('inventoryUpdated', handleInventoryUpdate);
    
    return () => {
      window.removeEventListener('inventoryUpdated', handleInventoryUpdate);
    };
  }, [activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const resetAdjustmentForm = () => {
    setAdjustmentForm({
      product_id: "",
      quantity_change: "",
      reason: "",
      notes: ""
    });
  };

  const resetVarianceForm = () => {
    setVarianceForm({
      product_id: "",
      physical_count: ""
    });
  };

  const handleCreateAdjustment = async (e) => {
    e.preventDefault();

    if (!adjustmentForm.product_id || adjustmentForm.quantity_change === "") {
      alert("Please select a product and enter quantity change");
      return;
    }

    try {
      await api.post("/inventory/adjustments", {
        product_id: adjustmentForm.product_id,
        quantity_change: Number(adjustmentForm.quantity_change),
        reason: adjustmentForm.reason,
        notes: adjustmentForm.notes
      });

      alert("Stock adjustment submitted for approval");
      setShowAdjustmentModal(false);
      resetAdjustmentForm();
      fetchTransactions();
      fetchSummary();
    } catch (error) {
      alert("Error creating stock adjustment: " + (error.response?.data?.message || error.message));
    }
  };

  const handleCreateVariance = async (e) => {
    e.preventDefault();

    if (!varianceForm.product_id || varianceForm.physical_count === "") {
      alert("Please select a product and enter physical count");
      return;
    }

    try {
      await api.post("/inventory/variances", {
        product_id: varianceForm.product_id,
        physical_count: Number(varianceForm.physical_count)
      });

      alert("Physical count submitted successfully");
      setShowVarianceModal(false);
      resetVarianceForm();
      fetchVariances();
      fetchSummary();
    } catch (error) {
      alert("Error creating physical count: " + (error.response?.data?.message || error.message));
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      PENDING: "badge--warning",
      APPROVED: "badge--success",
      REJECTED: "badge--error"
    };
    return statusMap[status] || "badge--secondary";
  };

  const getTransactionStatusClass = (status) => {
    const normalizedStatus = (status || "").toUpperCase();
    const statusClassMap = {
      PENDING: "status-pending",
      APPROVED: "status-approved",
      REJECTED: "status-rejected"
    };
    return statusClassMap[normalizedStatus] || "status-default";
  };

  const getTransactionTypeBadge = (type) => {
    const typeMap = {
      "PURCHASE_ORDER_RECEIVED": "badge--error",
      "BUY": "badge--error",
      "SALE": "badge--success",
      "MANUAL_ADJUSTMENT": "badge--primary",
      "STOCK_COUNT": "badge--secondary",
      "DAMAGE": "badge--error",
      "RETURN": "badge--warning",
      "TRANSFER": "badge--primary",
      "SUPPLIER_PAYMENT": "badge--info"
    };
    console.log("Transaction type:", type, "Badge class:", typeMap[type] || "badge--secondary");
    return typeMap[type] || "badge--secondary";
  };

  const getTransactionTypeDisplay = (type) => {
    const displayMap = {
      PURCHASE_ORDER_RECEIVED: "Buy",
      SALE: "Sale",
      MANUAL_ADJUSTMENT: "Manual Adjustment",
      STOCK_COUNT: "Stock Count",
      DAMAGE: "Damage",
      RETURN: "Return",
      TRANSFER: "Transfer",
      SUPPLIER_PAYMENT: "Supplier Payment"
    };
    return displayMap[type] || type.replace(/_/g, " ");
  };

  const getQuantityColorClass = (transactionType, quantityChange) => {
    // Money-in transactions should look positive, money-out should look negative.
    const moneyInTypes = ["SALE", "RETURN"];
    const moneyOutTypes = ["BUY", "PURCHASE_ORDER_RECEIVED", "SUPPLIER_PAYMENT"];

    if (moneyInTypes.includes(transactionType)) return "value text-success";
    if (moneyOutTypes.includes(transactionType)) return "value text-error";

    // Fallback for non-cash movements (adjustments/count/transfer/damage).
    return quantityChange >= 0 ? "value text-success" : "value text-error";
  };

  // Handle create PO from alert
  const handleCreatePO = async (alertId) => {
    try {
      console.log("Creating PO for alert:", alertId);
      const res = await api.post(`/inventory/alerts/${alertId}/create-po`, {});
      console.log("PO creation response:", res.data);
      if (res.data.success) {
        alert("✅ Purchase Order created successfully!");
        fetchAlerts();
      }
    } catch (error) {
      console.error("PO creation error:", error);
      console.error("Error response:", error.response?.data);
      alert("❌ Error creating PO: " + (error.response?.data?.message || error.message));
    }
  };

  // Handle dismiss alert
  const handleDismissAlert = async (alertId) => {
    try {
      const res = await api.patch(`/inventory/alerts/${alertId}/dismiss`, {});
      if (res.data.success) {
        alert("✅ Alert dismissed");
        fetchAlerts();
      }
    } catch (error) {
      alert("❌ Error dismissing alert: " + error.response?.data?.message);
    }
  };

  // Approve pending transaction
  const handleApproveTransaction = async (transactionId) => {
    try {
      const res = await api.patch(`/inventory/transactions/${transactionId}/approve`, {
        approval_notes: approvalNotes
      });
      if (res.data.success) {
        alert("✅ Transaction approved");
        setApprovalNotes("");
        setApprovingTxnId(null);
        fetchTransactions();
        fetchSummary();
      }
    } catch (error) {
      alert("❌ Error approving transaction: " + (error.response?.data?.message || error.message));
    }
  };

  // Reject pending transaction
  const handleRejectTransaction = async (transactionId) => {
    try {
      const res = await api.patch(`/inventory/transactions/${transactionId}/reject`, {
        approval_notes: approvalNotes
      });
      if (res.data.success) {
        alert("✅ Transaction rejected");
        setApprovalNotes("");
        setApprovingTxnId(null);
        fetchTransactions();
      }
    } catch (error) {
      alert("❌ Error rejecting transaction: " + (error.response?.data?.message || error.message));
    }
  };

  const handleApproveVariance = async (varianceId) => {
    try {
      const res = await api.patch(`/inventory/variances/${varianceId}`, {
        investigation_status: "RESOLVED",
        investigation_notes: "Approved by admin"
      });

      if (res.data.success) {
        alert("✅ Variance approved and marked as resolved");
        fetchVariances();
      }
    } catch (error) {
      alert("❌ Error approving variance: " + (error.response?.data?.message || error.message));
    }
  };

  const handleCancelVariance = async (varianceId) => {
    try {
      const res = await api.patch(`/inventory/variances/${varianceId}`, {
        investigation_status: "CLOSED",
        investigation_notes: "Cancelled by admin"
      });

      if (res.data.success) {
        alert("✅ Variance cancelled and closed");
        fetchVariances();
      }
    } catch (error) {
      alert("❌ Error cancelling variance: " + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <h1>📦 Inventory Management</h1>
        <div className="header-actions">
          <button
            className="btn btn--primary"
            onClick={() => setShowAdjustmentModal(true)}
          >
            + Stock Adjustment
          </button>
          <button
            className="btn btn--secondary"
            onClick={() => setShowVarianceModal(true)}
          >
            + Physical Count
          </button>
        </div>
      </div>

      <div className="inventory-tabs">
        <button
          className={`tab-btn ${activeTab === "transactions" ? "active" : ""}`}
          onClick={() => handleTabChange("transactions")}
        >
          📋 Transactions
        </button>
        <button
          className={`tab-btn ${activeTab === "variances" ? "active" : ""}`}
          onClick={() => handleTabChange("variances")}
        >
          ⚠️ Variances
        </button>
        <button
          className={`tab-btn ${activeTab === "alerts" ? "active" : ""}`}
          onClick={() => handleTabChange("alerts")}
        >
          🔔 Low Stock
        </button>
        <button
          className={`tab-btn ${activeTab === "analytics" ? "active" : ""}`}
          onClick={() => handleTabChange("analytics")}
        >
          📊 Analytics
        </button>
      </div>

      {/* TRANSACTIONS TAB */}
      {activeTab === "transactions" && (
        <div className="tab-content">
          <div className="filter-bar">
            <select
              value={filters.transactionType}
              onChange={(e) => setFilters({ ...filters, transactionType: e.target.value })}
              className="filter-select"
            >
              <option value="">All Transaction Types</option>
              <option value="BUY">Buy</option>
              <option value="SALE">Sale</option>
              <option value="MANUAL_ADJUSTMENT">Manual Adjustment</option>
              <option value="STOCK_COUNT">Stock Count</option>
              <option value="DAMAGE">Damage</option>
              <option value="SUPPLIER_PAYMENT">Supplier Payment</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <input
              type="number"
              placeholder="Days"
              value={filters.days}
              onChange={(e) => setFilters({ ...filters, days: e.target.value })}
              className="filter-input"
            />
          </div>

          {loading ? (
            <div className="spinner"></div>
          ) : transactions.length === 0 ? (
            <div className="no-data">No transactions found</div>
          ) : (
            <div className="table-wrapper">
              <div className="transactions-header">
                <div className="header-cell">Product</div>
                <div className="header-cell">Type</div>
                <div className="header-cell">Quantity</div>
                <div className="header-cell">Before → After</div>
                <div className="header-cell">Status</div>
                <div className="header-cell">Date</div>
                <div className="header-cell">By</div>
              </div>
              <div className="transactions-grid">
                {transactions.map((txn) => (
                  <div key={txn._id} className={`transaction-card ${getTransactionStatusClass(txn.status)}`}>
                    <div className="card-header">
                      <span className="product-name">{txn.product_name}</span>
                    </div>
                    
                    <div className="card-body">
                      <span className={`badge ${getTransactionTypeBadge(txn.transaction_type)}`}>
                        {getTransactionTypeDisplay(txn.transaction_type)}
                      </span>
                    </div>
                    
                    <div className="transaction-row">
                      <span className={getQuantityColorClass(txn.transaction_type, txn.quantity_change)}>
                        {txn.quantity_change > 0 ? "+" : ""}{txn.quantity_change}
                      </span>
                    </div>
                    
                    <div className="transaction-row">
                      <span className="value">{txn.quantity_before} → {txn.quantity_after}</span>
                    </div>
                    
                    <div className="transaction-row">
                      <span className={`badge ${getStatusBadge(txn.status)}`}>
                        {(txn.status || "UNKNOWN").replace(/_/g, " ")}
                      </span>
                    </div>
                    
                    <div className="transaction-row">
                      <span className="value">{new Date(txn.createdAt).toLocaleDateString()}</span>
                    </div>
                    
                    <div className="transaction-row">
                      <span className="value">{txn.created_by?.name || "System"}</span>
                    </div>

                    {txn.status === "PENDING" && isAdmin && (
                      <div className="transaction-row actions">
                        <button
                          className="btn btn-micro btn--success"
                          onClick={() => setApprovingTxnId(txn._id)}
                        >
                          ✓ Approve
                        </button>
                        <button
                          className="btn btn-micro btn--danger"
                          onClick={() => {
                            if (confirm("Reject this transaction?")) {
                              handleRejectTransaction(txn._id);
                            }
                          }}
                        >
                          ✕ Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {approvingTxnId && (
        <div className="inventory-modal-overlay" onClick={() => setApprovingTxnId(null)}>
          <div className="inventory-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Approve Transaction</h3>
            <p style={{ color: "#666", marginBottom: "1rem" }}>Add optional approval notes:</p>
            <textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="Notes (optional)"
              rows={3}
              style={{ width: "100%", marginBottom: "1rem" }}
            />
            <div className="inventory-modal-actions">
              <button type="button" className="btn btn--secondary" onClick={() => setApprovingTxnId(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--success"
                onClick={() => handleApproveTransaction(approvingTxnId)}
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VARIANCES TAB */}
      {activeTab === "variances" && (
        <div className="tab-content">
          <div className="filter-bar">
            <select
              value={varianceStatusFilter}
              onChange={(e) => setVarianceStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="">All Variance Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="INVESTIGATING">Investigating</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {loading ? (
            <div className="spinner"></div>
          ) : (
            <div className="grid grid--2">
              {variances.map((variance) => (
                <div key={variance._id} className="card card--interactive variance-card">
                  <div className="card-header">
                    <h3>{variance.product_name}</h3>
                    <span className={`badge badge--${variance.variance_type === "SHORTAGE" ? "error" : "warning"}`}>
                      {variance.variance_type}
                    </span>
                  </div>
                  <div className="card-body">
                    <div className="variance-stat">
                      <span>System Stock:</span>
                      <strong>{variance.system_quantity}</strong>
                    </div>
                    <div className="variance-stat">
                      <span>Physical Count:</span>
                      <strong>{variance.physical_count}</strong>
                    </div>
                    <div className="variance-stat">
                      <span>Variance:</span>
                      <strong className="text-error">{variance.variance} ({variance.variance_percentage}%)</strong>
                    </div>
                    <div className="variance-stat">
                      <span>Status:</span>
                      <span className="badge badge--secondary">{variance.investigation_status}</span>
                    </div>
                    {isAdmin && variance.investigation_status === "PENDING" && (
                      <div className="variance-stat" style={{ borderBottom: "none", paddingTop: "0.75rem" }}>
                        <span>Action:</span>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            className="btn btn-micro btn--success"
                            onClick={() => handleApproveVariance(variance._id)}
                          >
                            ✓ Approve
                          </button>
                          <button
                            className="btn btn-micro btn--danger"
                            onClick={() => handleCancelVariance(variance._id)}
                          >
                            ✕ Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LOW STOCK ALERTS TAB */}
      {activeTab === "alerts" && (
        <div className="tab-content">
          {loading ? (
            <div className="spinner"></div>
          ) : alerts.length === 0 ? (
            <div className="low-stock-empty">
              <div className="low-stock-empty-icon">✅</div>
              <div className="low-stock-empty-title">All Stock Levels Healthy</div>
              <div className="low-stock-empty-text">No products are currently below their reorder points</div>
            </div>
          ) : (
            <div className="grid grid--2">
              {alerts.map((alert) => (
                <div key={alert._id} className="alert-card">
                  <div className="alert-card-header">
                    <h3 className="alert-card-title">{alert.product_name}</h3>
                    <span className="alert-status">
                      <span className="low-stock-indicator"></span>
                      ACTIVE
                    </span>
                  </div>
                  <div className="alert-card-body">
                    <div className="alert-stat">
                      <span className="alert-stat-label">Current Stock:</span>
                      <strong className="alert-stat-value critical">{alert.current_stock}</strong>
                    </div>
                    <div className="alert-stat">
                      <span className="alert-stat-label">Reorder Point:</span>
                      <strong className="alert-stat-value">{alert.reorder_point}</strong>
                    </div>
                    <div className="alert-stat">
                      <span className="alert-stat-label">Quantity to Order:</span>
                      <strong className="alert-stat-value warning">{alert.reorder_quantity}</strong>
                    </div>
                    <div className="alert-stat">
                      <span className="alert-stat-label">Supplier:</span>
                      <strong className="alert-stat-value">{alert.preferred_supplier_id?.name || "Not Set"}</strong>
                    </div>
                  </div>
                  <div className="alert-actions">
                    <button
                      className="btn-create-po"
                      onClick={() => handleCreatePO(alert._id)}
                    >
                      📦 Create PO
                    </button>
                    <button 
                      className="btn-dismiss"
                      onClick={() => handleDismissAlert(alert._id)}
                    >
                      ✕ Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ANALYTICS TAB */}
      {activeTab === "analytics" && (
        <div className="tab-content">
          <div className="analytics-section">
            <h2>📊 Inventory Summary by Category</h2>
            <div className="grid grid--2">
              {summary.map((cat) => (
                <div key={cat._id} className="stat-box">
                  <div className="stat-label">{cat._id}</div>
                  <div className="stat-value">{cat.total_stock}</div>
                  <div style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.5rem" }}>
                    Value: ${(cat.total_value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                  </div>
                  <div className="alert-stat" style={{ border: "none", padding: "0.5rem 0" }}>
                    <span className="alert-stat-label">Low Stock Items:</span>
                    {cat.low_stock_items > 0 ? (
                      <span className="low-stock-badge">
                        {cat.low_stock_items} items
                      </span>
                    ) : (
                      <span style={{ color: "#059669", fontWeight: "600", fontSize: "0.875rem" }}>
                        All Good ✓
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="analytics-section">
            <h2>🔄 Inventory Turnover (Last 30 Days)</h2>
            <div className="table-wrapper turnover-table-wrapper">
              <table className="table turnover-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Sold</th>
                    <th>Current Stock</th>
                    <th>Turnover Ratio</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {turnover.map((item) => (
                    <tr key={item._id}>
                      <td>{item.product_name}</td>
                      <td>{item.total_sold}</td>
                      <td>{item.current_stock}</td>
                      <td>
                        <strong>{item.turnover_ratio.toFixed(2)}</strong>
                      </td>
                      <td>${item.revenue.toLocaleString("en-US", { maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showAdjustmentModal && (
        <div className="inventory-modal-overlay" onClick={() => { setShowAdjustmentModal(false); resetAdjustmentForm(); }}>
          <div className="inventory-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Stock Adjustment</h3>
            <form className="inventory-form" onSubmit={handleCreateAdjustment}>
              <label htmlFor="adjustment-product">Product</label>
              <select
                id="adjustment-product"
                value={adjustmentForm.product_id}
                onChange={(e) => setAdjustmentForm({ ...adjustmentForm, product_id: e.target.value })}
                required
              >
                <option value="">Select Product</option>
                {products.map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.name} (Current: {product.current_stock})
                  </option>
                ))}
              </select>

              <label htmlFor="quantity-change">Quantity Change (+/-)</label>
              <input
                id="quantity-change"
                type="number"
                value={adjustmentForm.quantity_change}
                onChange={(e) => setAdjustmentForm({ ...adjustmentForm, quantity_change: e.target.value })}
                required
              />

              <label htmlFor="adjustment-reason">Reason</label>
              <input
                id="adjustment-reason"
                type="text"
                value={adjustmentForm.reason}
                onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })}
                placeholder="Damaged goods, correction, return, etc."
              />

              <label htmlFor="adjustment-notes">Notes</label>
              <textarea
                id="adjustment-notes"
                value={adjustmentForm.notes}
                onChange={(e) => setAdjustmentForm({ ...adjustmentForm, notes: e.target.value })}
                rows={3}
                placeholder="Optional details"
              />

              <div className="inventory-modal-actions">
                <button type="button" className="btn btn--secondary" onClick={() => { setShowAdjustmentModal(false); resetAdjustmentForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary">
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showVarianceModal && (
        <div className="inventory-modal-overlay" onClick={() => { setShowVarianceModal(false); resetVarianceForm(); }}>
          <div className="inventory-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Physical Count</h3>
            <form className="inventory-form" onSubmit={handleCreateVariance}>
              <label htmlFor="variance-product">Product</label>
              <select
                id="variance-product"
                value={varianceForm.product_id}
                onChange={(e) => setVarianceForm({ ...varianceForm, product_id: e.target.value })}
                required
              >
                <option value="">Select Product</option>
                {products.map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.name} (System: {product.current_stock})
                  </option>
                ))}
              </select>

              <label htmlFor="physical-count">Physical Count</label>
              <input
                id="physical-count"
                type="number"
                min="0"
                value={varianceForm.physical_count}
                onChange={(e) => setVarianceForm({ ...varianceForm, physical_count: e.target.value })}
                required
              />

              <div className="inventory-modal-actions">
                <button type="button" className="btn btn--secondary" onClick={() => { setShowVarianceModal(false); resetVarianceForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary">
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
