import { useState, useEffect } from "react"
import api from "../services/apiClient"
import "../styles/suppliers-new.css"

function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [activePaymentSupplierId, setActivePaymentSupplierId] = useState("")
  const [supplierPayments, setSupplierPayments] = useState([])
  const [paymentLoading, setPaymentLoading] = useState(false)

  const paymentMethods = ["CASH", "BANK_TRANSFER", "UPI", "CHEQUE"]

  const [paymentFormData, setPaymentFormData] = useState({
    amount: "",
    payment_method: "BANK_TRANSFER",
    reference_number: "",
    notes: ""
  })

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    categories: [],
    address: "",
    city: "",
    state: "",
    bank_details: {
      account_holder: "",
      account_number: "",
      ifsc_code: "",
      bank_name: ""
    },
    upi_id: "",
    notes: ""
  })

  const [selectedCategories, setSelectedCategories] = useState([])
  const categoryOptions = ["Electronics", "Groceries", "Clothing", "Books", "Furniture", "Other"]

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      setError("")
      const response = await api.get("/suppliers")
      console.log("=== FETCH SUPPLIERS DEBUG ===");
      console.log("Suppliers fetched:", response.data)
      console.log("Number of suppliers:", response.data.length);
      if (response.data.length > 0) {
        console.log("First supplier structure:", response.data[0]);
        console.log("First supplier._id:", response.data[0]._id);
        console.log("All supplier IDs:", response.data.map(s => ({ name: s.name, _id: s._id })));
      }
      console.log("=== END FETCH SUPPLIERS DEBUG ===");
      setSuppliers(response.data)
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || "Failed to fetch suppliers"
      setError(errorMsg)
      console.error("Fetch suppliers error:", {
        status: err.response?.status,
        message: err.response?.data?.message,
        error: err.message
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    if (name.includes("bank_details.")) {
      const field = name.split(".")[1]
      setFormData({
        ...formData,
        bank_details: { ...formData.bank_details, [field]: value }
      })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const handleCategoryToggle = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!formData.name || !formData.phone || !formData.email || selectedCategories.length === 0) {
      setError("Name, phone, email, and at least one category are required")
      return
    }

    try {
      const submitData = { ...formData, categories: selectedCategories }
      console.log("Submitting supplier data:", { editingId, submitData });

      if (editingId) {
        console.log("=== SUBMIT DEBUG ===");
        console.log(`Updating supplier with ID: ${editingId}`);
        console.log("EditingId type:", typeof editingId);
        console.log("EditingId value:", editingId);
        console.log("Submit data:", submitData);
        console.log("API URL:", `/suppliers/${editingId}`);
        
        const response = await api.put(`/suppliers/${editingId}`, submitData)
        console.log("Update response:", response.data);
        setSuccess("Supplier updated successfully!")
      } else {
        console.log("Creating new supplier");
        const response = await api.post("/suppliers", submitData)
        console.log("Create response:", response.data);
        setSuccess("Supplier added successfully!")
      }

      fetchSuppliers()
      resetForm()
    } catch (err) {
      console.error("Error saving supplier:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);
      setError(err.response?.data?.message || "Failed to save supplier")
    }
  }

  const handleEdit = (supplier) => {
    console.log("=== EDIT SUPPLIER DEBUG ===");
    console.log("Full supplier object:", supplier);
    console.log("Supplier._id:", supplier._id);
    console.log("Supplier.id:", supplier.id);
    console.log("Type of _id:", typeof supplier._id);
    console.log("Is _id truthy?:", !!supplier._id);
    
    if (!supplier._id) {
      console.error("ERROR: Supplier._id is missing or falsy!");
      setError("Unable to edit supplier: Invalid supplier ID");
      return;
    }
    
    setFormData({
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address || "",
      city: supplier.city || "",
      state: supplier.state || "",
      bank_details: supplier.bank_details || {
        account_holder: "",
        account_number: "",
        ifsc_code: "",
        bank_name: ""
      },
      upi_id: supplier.upi_id || "",
      notes: supplier.notes || ""
    })
    setSelectedCategories(supplier.categories || [])
    setEditingId(supplier._id)
    setShowForm(true)
    console.log("Edit form setup complete. EditingId:", supplier._id);
    console.log("=== END EDIT SUPPLIER DEBUG ===");
  }

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this supplier?")) {
      try {
        await api.delete(`/suppliers/${id}`)
        setSuccess("Supplier deleted successfully!")
        fetchSuppliers()
      } catch (err) {
        setError("Failed to delete supplier")
      }
    }
  }

  const fetchSupplierPayments = async (supplierId) => {
    try {
      setPaymentLoading(true)
      const response = await api.get(`/suppliers/${supplierId}/payments`)
      setSupplierPayments(response.data?.payments || [])
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch supplier payments")
      setSupplierPayments([])
    } finally {
      setPaymentLoading(false)
    }
  }

  const togglePaymentPanel = async (supplierId) => {
    setError("")
    setSuccess("")

    if (activePaymentSupplierId === supplierId) {
      setActivePaymentSupplierId("")
      setSupplierPayments([])
      return
    }

    setActivePaymentSupplierId(supplierId)
    await fetchSupplierPayments(supplierId)
  }

  const handlePaymentInputChange = (e) => {
    const { name, value } = e.target
    setPaymentFormData((prev) => ({ ...prev, [name]: value }))
  }

  const resetPaymentForm = () => {
    setPaymentFormData({
      amount: "",
      payment_method: "BANK_TRANSFER",
      reference_number: "",
      notes: ""
    })
  }

  const handlePaymentSubmit = async (e, supplier) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    const amount = parseFloat(paymentFormData.amount)
    if (!amount || amount <= 0) {
      setError("Please enter a valid payment amount")
      return
    }

    if (amount > supplier.balance_due) {
      setError("Payment cannot exceed supplier balance due")
      return
    }

    try {
      await api.post(`/suppliers/${supplier._id}/payments`, {
        ...paymentFormData,
        amount
      })

      setSuccess("Payment recorded successfully")
      resetPaymentForm()
      await Promise.all([fetchSuppliers(), fetchSupplierPayments(supplier._id)])
    } catch (err) {
      setError(err.response?.data?.message || "Failed to record payment")
    }
  }

  const resetForm = () => {
    console.log("Resetting form");
    setFormData({
      name: "",
      phone: "",
      email: "",
      categories: [],
      address: "",
      city: "",
      state: "",
      bank_details: {
        account_holder: "",
        account_number: "",
        ifsc_code: "",
        bank_name: ""
      },
      upi_id: "",
      notes: ""
    })
    setSelectedCategories([])
    setEditingId(null)
    setShowForm(false)
    console.log("Form reset complete");
  }

  const filteredSuppliers = suppliers.filter((supplier) => {
    const matchesSearch =
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === "" || supplier.categories.includes(filterCategory)
    return matchesSearch && matchesCategory
  })

  return (
    <div className="suppliers-container">
      <div className="suppliers-header">
        <h1>Suppliers Management</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ Add Supplier"}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="supplier-form-container">
          <h2>{editingId ? "Edit Supplier" : "Add New Supplier"}</h2>
          <form onSubmit={handleSubmit} className="supplier-form">
            <div className="form-section">
              <h3>Basic Information</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Supplier Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>UPI ID</label>
                  <input
                    type="text"
                    name="upi_id"
                    value={formData.upi_id}
                    onChange={handleInputChange}
                    placeholder="yourname@upi"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Categories *</label>
                <div className="checkbox-group">
                  {categoryOptions.map((cat) => (
                    <label key={cat} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat)}
                        onChange={() => handleCategoryToggle(cat)}
                      />
                      {cat}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Address</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input type="text" name="city" value={formData.city} onChange={handleInputChange} />
                </div>
              </div>
              <div className="form-group">
                <label>State</label>
                <input type="text" name="state" value={formData.state} onChange={handleInputChange} />
              </div>
            </div>

            <div className="form-section">
              <h3>Bank Details</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Account Holder</label>
                  <input
                    type="text"
                    name="bank_details.account_holder"
                    value={formData.bank_details.account_holder}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Bank Name</label>
                  <input
                    type="text"
                    name="bank_details.bank_name"
                    value={formData.bank_details.bank_name}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Account Number</label>
                  <input
                    type="text"
                    name="bank_details.account_number"
                    value={formData.bank_details.account_number}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>IFSC Code</label>
                  <input
                    type="text"
                    name="bank_details.ifsc_code"
                    value={formData.bank_details.ifsc_code}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Additional Notes</h3>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="Any additional information about the supplier..."
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editingId ? "Update Supplier" : "Add Supplier"}
              </button>
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Reset
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="suppliers-filters">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="filter-select"
        >
          <option value="">All Categories</option>
          {categoryOptions.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading">Loading suppliers...</div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="no-data">No suppliers found</div>
      ) : (
        <div className="suppliers-grid">
          {filteredSuppliers.map((supplier) => (
            <div key={supplier._id} className="supplier-card">
              <div className="supplier-card-header">
                <h3>{supplier.name}</h3>
                <span className="status-badge">{supplier.is_active ? "Active" : "Inactive"}</span>
              </div>

              <div className="supplier-info">
                <p>
                  <strong>Email:</strong> {supplier.email}
                </p>
                <p>
                  <strong>Phone:</strong> {supplier.phone}
                </p>
                {supplier.address && (
                  <p>
                    <strong>Address:</strong> {supplier.address}
                    {supplier.city && `, ${supplier.city}`}
                    {supplier.state && `, ${supplier.state}`}
                  </p>
                )}
                <div className="categories">
                  {supplier.categories.map((cat) => (
                    <span key={cat} className="category-badge">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              <div className="supplier-financials">
                <div className="financial-item">
                  <span className="label">Balance Due:</span>
                  <span className="amount">₹{supplier.balance_due.toFixed(2)}</span>
                </div>
                <div className="financial-item">
                  <span className="label">Total Paid:</span>
                  <span className="amount">₹{supplier.total_paid.toFixed(2)}</span>
                </div>
              </div>

              <div className="supplier-actions">
                <button className="btn-edit" onClick={() => handleEdit(supplier)}>
                  Edit
                </button>
                <button className="btn-pay" onClick={() => togglePaymentPanel(supplier._id)}>
                  {activePaymentSupplierId === supplier._id ? "Close Payment" : "Record Payment"}
                </button>
                <button className="btn-delete" onClick={() => handleDelete(supplier._id)}>
                  Delete
                </button>
              </div>

              {activePaymentSupplierId === supplier._id && (
                <div className="supplier-payment-panel">
                  <h4>Record Payment</h4>
                  <form
                    className="supplier-payment-form"
                    onSubmit={(e) => handlePaymentSubmit(e, supplier)}
                  >
                    <div className="form-row">
                      <div className="form-group">
                        <label>Amount *</label>
                        <input
                          type="number"
                          name="amount"
                          value={paymentFormData.amount}
                          onChange={handlePaymentInputChange}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          max={supplier.balance_due}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Method *</label>
                        <select
                          name="payment_method"
                          value={paymentFormData.payment_method}
                          onChange={handlePaymentInputChange}
                        >
                          {paymentMethods.map((method) => (
                            <option key={method} value={method}>
                              {method}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Reference</label>
                        <input
                          type="text"
                          name="reference_number"
                          value={paymentFormData.reference_number}
                          onChange={handlePaymentInputChange}
                          placeholder="UTR / Cheque / Txn ID"
                        />
                      </div>
                      <div className="form-group">
                        <label>Notes</label>
                        <input
                          type="text"
                          name="notes"
                          value={paymentFormData.notes}
                          onChange={handlePaymentInputChange}
                          placeholder="Optional details"
                        />
                      </div>
                    </div>

                    <div className="payment-balance-row">
                      <span>Current Due:</span>
                      <strong>₹{supplier.balance_due.toFixed(2)}</strong>
                    </div>

                    <button type="submit" className="btn-primary">
                      Save Payment
                    </button>
                  </form>

                  <div className="supplier-payment-history">
                    <h5>Recent Payments</h5>
                    {paymentLoading ? (
                      <p className="mini-loading">Loading payment history...</p>
                    ) : supplierPayments.length === 0 ? (
                      <p className="mini-loading">No payments recorded yet.</p>
                    ) : (
                      <div className="history-list">
                        {supplierPayments.slice(0, 5).map((payment) => (
                          <div key={payment._id} className="history-item">
                            <span>{new Date(payment.payment_date).toLocaleDateString()}</span>
                            <span>{payment.payment_method}</span>
                            <strong>₹{payment.amount.toFixed(2)}</strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Suppliers
