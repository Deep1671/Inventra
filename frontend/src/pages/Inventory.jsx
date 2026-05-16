import React, { useState, useEffect } from "react";
import api from "../services/apiClient";
import { useApiData } from "../hooks/useCache";
import { useMutation } from "../hooks/useMutation";
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
  const [filters, setFilters] = useState({
    transactionType: "",
    days: 30,
    status: ""
  });
  const [approvalNotes, setApprovalNotes] = useState("");
  const [approvingTxnId, setApprovingTxnId] = useState(null);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showVarianceModal, setShowVarianceModal] = useState(false);
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

  // Build query strings for dynamic caching
  const transactionQuery = new URLSearchParams({
    ...(filters.transactionType && { transaction_type: filters.transactionType }),
    ...(filters.days && { days: filters.days }),
    ...(filters.status && { status: filters.status })
  }).toString();

  const varianceQuery = new URLSearchParams({
    ...(varianceStatusFilter && { status: varianceStatusFilter })
  }).toString();

  // Fetch inventory transactions with caching
  const { 
    data: transactionData = { data: [] }, 
    loading: txnLoading, 
    refetch: refetchTransactions 
  } = useApiData(
    `/inventory/transactions${transactionQuery ? `?${transactionQuery}` : ''}`
  );

  // Fetch products
  const { 
    data: productsData = [], 
    refetch: refetchProducts 
  } = useApiData('/products');

  // Fetch stock variances
  const { 
    data: varianceData = { data: [] }, 
    loading: varianceLoading, 
    refetch: refetchVariances 
  } = useApiData(
    `/inventory/variances${varianceQuery ? `?${varianceQuery}` : ''}`
  );

  // Fetch low stock alerts
  const { 
    data: alertsData = { data: [] }, 
    loading: alertsLoading, 
    refetch: refetchAlerts 
  } = useApiData(
    '/inventory/alerts'
  );

  // Fetch inventory summary
  const { 
    data: summaryData = { data: [] }, 
    refetch: refetchSummary 
  } = useApiData(
    '/inventory/summary'
  );

  // Fetch turnover metrics
  const { 
    data: turnoverData = { data: [] }, 
    refetch: refetchTurnover 
  } = useApiData(
    '/inventory/turnover?days=30'
  );

  // Mutation for adjustment approval
  const { mutate: approveAdjustment, loading: approving } = useMutation(
    '/inventory/adjustments/{txnId}/approve',
    { autoInvalidate: true }
  );

  // Mutation for creating adjustments
  const { mutate: createAdjustment, loading: creating } = useMutation(
    '/inventory/adjustments',
    { autoInvalidate: true }
  );

  // Mutation for recording variances
  const { mutate: recordVariance, loading: recording } = useMutation(
    '/inventory/variances',
    { autoInvalidate: true }
  );

  const transactions = transactionData.data || [];
  const variances = varianceData.data || [];
  const alerts = alertsData.data || [];
  const summary = summaryData.data || [];
  const turnover = turnoverData.data || [];
  const products = productsData;

  // Listen for inventory updates from other components (like PO delivery)
  useEffect(() => {
    const handleInventoryUpdate = (event) => {
      console.log("Inventory updated event received:", event.detail);
      console.log("Refreshing inventory data due to external update...");
      
      // Refresh alerts if on alerts tab
      if (activeTab === "alerts") {
        refetchAlerts();
      }
      
      // Always refresh summary data as stock levels may have changed
      refetchSummary();
      
      // Refresh all tabs data
      refetchTransactions();
      refetchVariances();
      refetchTurnover();
    };
    
    window.addEventListener('inventoryUpdated', handleInventoryUpdate);
    
    return () => {
      window.removeEventListener('inventoryUpdated', handleInventoryUpdate);
    };
  }, [refetchAlerts, refetchSummary, refetchTransactions, refetchVariances, refetchTurnover, activeTab]);

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
      await createAdjustment({
        product_id: adjustmentForm.product_id,
        quantity_change: Number(adjustmentForm.quantity_change),
        reason: adjustmentForm.reason,
        notes: adjustmentForm.notes
      });

      alert("Stock adjustment submitted for approval");
      setShowAdjustmentModal(false);
      resetAdjustmentForm();
      refetchTransactions();
      refetchSummary();
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
      await recordVariance({
        product_id: varianceForm.product_id,
        physical_count: Number(varianceForm.physical_count)
      });

      alert("Physical count submitted successfully");
      setShowVarianceModal(false);
      resetVarianceForm();
      refetchVariances();
      refetchSummary();
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
        refetchAlerts();
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
        refetchAlerts();
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
        refetchTransactions();
        refetchSummary();
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
        refetchTransactions();
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
        refetchVariances();
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
        refetchVariances();
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
            <div>
              <span>Transaction Type:</span>
              <select
                value={filters.transactionType}
                onChange={(e) => setFilters({ ...filters, transactionType: e.target.value })}
                className="filter-select"
              >
                <option value="">All</option>
                <option value="BUY">Buy</option>
                <option value="SALE">Sale</option>
                <option value="MANUAL_ADJUSTMENT">Manual Adjustment</option>
                <option value="STOCK_COUNT">Stock Count</option>
                <option value="DAMAGE">Damage</option>
                <option value="SUPPLIER_PAYMENT">Supplier Payment</option>
              </select>
            </div>
            <div>
              <span>Status:</span>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="filter-select"
              >
                <option value="">All</option>
                <option value="PENDING">Pending Approval</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            <div>
              <span>Total Days:</span>
              <input
                type="number"
                placeholder="30"
                value={filters.days}
                onChange={(e) => setFilters({ ...filters, days: e.target.value })}
                className="filter-input"
              />
            </div>
          </div>

          {txnLoading ? (
            <div className="spinner"></div>
          ) : transactions.length === 0 ? (
            <div className="no-data">No transactions found</div>
          ) : (
            <div className="table-wrapper">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Before → After</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>By</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => (
                    <tr key={txn._id} className={`transaction-row ${getTransactionStatusClass(txn.status)}`}>
                      <td className="product-cell">
                        <span className="product-name">{txn.product_name}</span>
                      </td>
                      <td className="type-cell">
                        <span className={`badge ${getTransactionTypeBadge(txn.transaction_type)}`}>
                          {getTransactionTypeDisplay(txn.transaction_type)}
                        </span>
                      </td>
                      <td className="quantity-cell">
                        <span className={getQuantityColorClass(txn.transaction_type, txn.quantity_change)}>
                          {txn.quantity_change > 0 ? "+" : ""}{txn.quantity_change}
                        </span>
                      </td>
                      <td className="before-after-cell">
                        <span className="value">{txn.quantity_before} → {txn.quantity_after}</span>
                      </td>
                      <td className="status-cell">
                        <span className={`badge ${getStatusBadge(txn.status)}`}>
                          {(txn.status || "UNKNOWN").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="date-cell">
                        <span className="value">{new Date(txn.createdAt).toLocaleDateString()}</span>
                      </td>
                      <td className="by-cell">
                        <span className="value">{txn.created_by?.name || "System"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

          {varianceLoading ? (
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
          {alertsLoading ? (
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
            <div style={{ display: "flex", gap: "1.5rem", height: "100%", overflow: "auto" }}>
            {/* Left Card - Summary */}
            <div className="analytics-section" style={{ flex: "1", minWidth: "400px", maxHeight: "100%" }}>
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

            {/* Right Card - Turnover Table */}
            <div className="analytics-section" style={{ flex: "1", minWidth: "400px", maxHeight: "100%", overflow: "auto" }}>
              <h2>🔄 Inventory Turnover (Last 30 Days)</h2>
              <div className="table-wrapper turnover-table-wrapper" style={{ maxHeight: "calc(100% - 50px)" }}>
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
