import { useState, useEffect } from "react"
import api from "../services/apiClient"
import "../styles/payments.css"

function Payments() {
  const [payments, setPayments] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [filterSupplier, setFilterSupplier] = useState("")
  const [filterMethod, setFilterMethod] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [formData, setFormData] = useState({
    supplier_id: "",
    amount: "",
    payment_method: "BANK_TRANSFER",
    reference_number: "",
    notes: ""
  })

  const paymentMethods = ["CASH", "BANK_TRANSFER", "UPI", "CHEQUE"]

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [paymentsRes, suppliersRes] = await Promise.all([
        api.get("/payments"),
        api.get("/suppliers")
      ])
      setPayments(paymentsRes.data.data || paymentsRes.data || [])
      setSuppliers(suppliersRes.data.data || suppliersRes.data || [])
      setError("")
    } catch (err) {
      setError("Failed to fetch data")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!formData.supplier_id || !formData.amount) {
      setError("Supplier and amount are required")
      return
    }

    if (parseFloat(formData.amount) <= 0) {
      setError("Amount must be greater than 0")
      return
    }

    try {
      await api.post("/payments", {
        ...formData,
        amount: parseFloat(formData.amount)
      })
      setSuccess("Payment recorded successfully!")
      fetchData()
      resetForm()
    } catch (err) {
      setError(err.response?.data?.message || "Failed to record payment")
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this payment record?")) {
      try {
        await api.delete(`/payments/${id}`)
        setSuccess("Payment deleted successfully!")
        fetchData()
      } catch (err) {
        setError("Failed to delete payment")
      }
    }
  }

  const resetForm = () => {
    setFormData({
      supplier_id: "",
      amount: "",
      payment_method: "BANK_TRANSFER",
      reference_number: "",
      notes: ""
    })
    setShowForm(false)
  }

  const getSupplierId = (supplierRef) => {
    if (!supplierRef) return ""
    return typeof supplierRef === "string" ? supplierRef : supplierRef._id
  }

  const getSupplierName = (supplierRef) => {
    if (!supplierRef) return "Unknown"
    if (typeof supplierRef === "object" && supplierRef.name) return supplierRef.name

    const supplierId = getSupplierId(supplierRef)
    return suppliers.find((s) => s._id === supplierId)?.name || "Unknown"
  }

  const getSupplierBalance = (supplierId) => {
    return suppliers.find((s) => s._id === supplierId)?.balance_due || 0
  }

  const filteredPayments = payments.filter((payment) => {
    const matchesSupplier =
      filterSupplier === "" || getSupplierId(payment.supplier_id) === filterSupplier
    const matchesMethod = filterMethod === "" || payment.payment_method === filterMethod
    return matchesSupplier && matchesMethod
  })

  const methodColors = {
    CASH: "#ffc107",
    BANK_TRANSFER: "#007bff",
    UPI: "#28a745",
    CHEQUE: "#6f42c1"
  }

  const totalPayments = filteredPayments.reduce((sum, p) => sum + p.amount, 0)
  const supplierStats = suppliers.map((supplier) => ({
    ...supplier,
    pending_amount: supplier.balance_due,
    paid_amount: supplier.total_paid
  }))

  return (
    <div className="payments-container">
      <div className="payments-header">
        <h1>Payment Tracking</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ Record Payment"}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="payment-form-container">
          <h2>Record New Payment</h2>
          <form onSubmit={handleSubmit} className="payment-form">
            <div className="form-row">
              <div className="form-group">
                <label>Supplier *</label>
                <select
                  name="supplier_id"
                  value={formData.supplier_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier._id} value={supplier._id}>
                      {supplier.name} (Due: ₹{supplier.balance_due.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Amount *</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Payment Method *</label>
                <select
                  name="payment_method"
                  value={formData.payment_method}
                  onChange={handleInputChange}
                >
                  {paymentMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Reference Number</label>
                <input
                  type="text"
                  name="reference_number"
                  value={formData.reference_number}
                  onChange={handleInputChange}
                  placeholder="e.g., UTR, Check No., UPI Ref."
                />
              </div>
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="3"
                placeholder="Any additional details..."
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                Record Payment
              </button>
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="stats-container">
        <div className="stat-card">
          <h4>Total Payments (This View)</h4>
          <p className="stat-amount">₹{totalPayments.toFixed(2)}</p>
        </div>
        <div className="stat-card">
          <h4>Active Suppliers</h4>
          <p className="stat-amount">{suppliers.length}</p>
        </div>
        <div className="stat-card">
          <h4>Total Due (All)</h4>
          <p className="stat-amount danger">
            ₹{suppliers.reduce((sum, s) => sum + s.balance_due, 0).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="filters-container">
        <select
          value={filterSupplier}
          onChange={(e) => setFilterSupplier(e.target.value)}
          className="filter-select"
        >
          <option value="">All Suppliers</option>
          {suppliers.map((supplier) => (
            <option key={supplier._id} value={supplier._id}>
              {supplier.name}
            </option>
          ))}
        </select>

        <select
          value={filterMethod}
          onChange={(e) => setFilterMethod(e.target.value)}
          className="filter-select"
        >
          <option value="">All Methods</option>
          {paymentMethods.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>
      </div>

      <div className="payments-section">
        <h2>Payment History</h2>
        {loading ? (
          <div className="loading">Loading payments...</div>
        ) : filteredPayments.length === 0 ? (
          <div className="no-data">No payments found</div>
        ) : (
          <div className="payments-table-container">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Notes</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment._id}>
                    <td>{new Date(payment.payment_date).toLocaleDateString()}</td>
                    <td>
                      <strong>{getSupplierName(payment.supplier_id)}</strong>
                    </td>
                    <td className="amount">₹{payment.amount.toFixed(2)}</td>
                    <td>
                      <span
                        className="method-badge"
                        style={{ backgroundColor: methodColors[payment.payment_method] }}
                      >
                        {payment.payment_method}
                      </span>
                    </td>
                    <td>{payment.reference_number || "-"}</td>
                    <td className="notes">{payment.notes || "-"}</td>
                    <td>
                      <button
                        className="btn-delete-small"
                        onClick={() => handleDelete(payment._id)}
                        title="Delete payment"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="supplier-stats-section">
        <h2>Supplier Account Summary</h2>
        {suppliers.length === 0 ? (
          <div className="no-data">No suppliers found</div>
        ) : (
          <div className="supplier-stats-grid">
            {supplierStats.map((supplier) => (
              <div key={supplier._id} className="supplier-stat-card">
                <h3>{supplier.name}</h3>
                <div className="stat-item">
                  <span className="label">Balance Due</span>
                  <span className="value" style={{ color: supplier.pending_amount > 0 ? "#dc3545" : "#28a745" }}>
                    ₹{supplier.pending_amount.toFixed(2)}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="label">Total Paid</span>
                  <span className="value">₹{supplier.paid_amount.toFixed(2)}</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${
                        supplier.paid_amount === 0 ? 0 : (supplier.paid_amount / (supplier.paid_amount + supplier.pending_amount)) * 100
                      }%`
                    }}
                  ></div>
                </div>
                <p className="progress-text">
                  {supplier.pending_amount === 0 ? "Fully Paid" : `${Math.round((supplier.paid_amount / (supplier.paid_amount + supplier.pending_amount)) * 100)}% Paid`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Payments
