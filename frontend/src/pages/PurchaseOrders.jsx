import { useState, useEffect } from "react"
import api from "../services/apiClient"
import "../styles/purchaseOrders.css"

function PurchaseOrders() {
  const [orders, setOrders] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState("")
  const [filterSupplier, setFilterSupplier] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [formData, setFormData] = useState({
    supplier_id: "",
    items: [{ product_id: "", quantity: 1, unit_price: 0 }],
    notes: "",
    expected_delivery_date: ""
  })

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    console.log("Products state updated:", {
      count: products.length,
      products: products.map(p => ({ _id: p._id, name: p.name }))
    })
  }, [products])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [ordersRes, suppliersRes, productsRes] = await Promise.all([
        api.get("/purchase-orders"),
        api.get("/suppliers"),
        api.get("/products")
      ])
      console.log("PurchaseOrders - API Responses:", {
        orders: ordersRes.data,
        suppliers: suppliersRes.data,
        products: productsRes.data
      })
      
      setOrders(ordersRes.data.data || ordersRes.data || [])
      setSuppliers(suppliersRes.data.data || suppliersRes.data || [])
      
      // Products API returns array directly
      const productsData = Array.isArray(productsRes.data) ? productsRes.data : (productsRes.data.data || [])
      console.log("Products extracted:", productsData)
      setProducts(productsData)
      
      setError("")
    } catch (err) {
      setError("Failed to fetch data")
      console.error("Fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleItemChange = (index, field, value) => {
    console.log(`Item ${index} field "${field}" changed to:`, value)
    const newItems = [...formData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    setFormData({ ...formData, items: newItems })
    console.log("Updated formData items:", newItems)
  }

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: "", quantity: 1, unit_price: 0 }]
    })
  }

  const removeItem = (index) => {
    if (formData.items.length > 1) {
      setFormData({
        ...formData,
        items: formData.items.filter((_, i) => i !== index)
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    console.log("Form data on submit:", formData)
    
    if (!formData.supplier_id) {
      setError("Please select a supplier")
      console.error("Validation failed: No supplier selected")
      return
    }

    // Check all items have required fields
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i]
      if (!item.product_id) {
        setError(`Item ${i + 1}: Please select a product`)
        console.error(`Validation failed: Item ${i} missing product_id`, item)
        return
      }
      if (!item.quantity || item.quantity <= 0) {
        setError(`Item ${i + 1}: Please enter a valid quantity`)
        console.error(`Validation failed: Item ${i} invalid quantity`, item)
        return
      }
      if (!item.unit_price || item.unit_price <= 0) {
        setError(`Item ${i + 1}: Please enter a valid unit price`)
        console.error(`Validation failed: Item ${i} invalid unit_price`, item)
        return
      }
    }

    try {
      console.log("Sending PO data to backend:", formData)
      await api.post("/purchase-orders", formData)
      setSuccess("Purchase order created successfully!")
      fetchData()
      resetForm()
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data?.error?.message || err.message || "Failed to create order"
      setError(errorMessage)
      console.error("Error creating PO:", {
        message: errorMessage,
        errorData: err.response?.data,
        fullError: err
      })
    }
  }

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      console.log(`Updating PO ${orderId} status to ${newStatus}`);
      const response = await api.patch(`/purchase-orders/${orderId}/status`, { status: newStatus });
      console.log("Status update response:", response.data);
      
      setSuccess("Order status updated successfully!");
      
      // If delivered, also log that alerts should be dismissed
      if (newStatus === "DELIVERED") {
        console.log("🚚 PO marked as delivered - stock should be updated and alerts dismissed");
        console.log("📡 Dispatching inventoryUpdated event...");
        // Dispatch a custom event to notify other components to refresh
        window.dispatchEvent(new CustomEvent('inventoryUpdated', { 
          detail: { reason: 'PO_DELIVERED', orderId } 
        }));
        console.log("✅ Event dispatched successfully");
      }
      
      fetchData();
    } catch (err) {
      console.error("Error updating status:", err);
      setError("Failed to update order status");
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this order?")) {
      try {
        await api.delete(`/purchase-orders/${id}`)
        setSuccess("Order deleted successfully!")
        fetchData()
      } catch (err) {
        setError("Failed to delete order")
      }
    }
  }

  const resetForm = () => {
    setFormData({
      supplier_id: "",
      items: [{ product_id: "", quantity: 1, unit_price: 0 }],
      notes: "",
      expected_delivery_date: ""
    })
    setShowForm(false)
  }

  const getProductDetails = (productId) => {
    console.log("Looking for product:", productId)
    console.log("Available products:", products)
    const product = products.find((p) => p._id === productId)
    console.log("Found product:", product)
    return product
  }

  const getSupplierName = (supplierId) => {
    return suppliers.find((s) => s._id === supplierId)?.name || "Unknown"
  }

  const filteredOrders = orders.filter((order) => {
    const matchesStatus = filterStatus === "" || order.status === filterStatus
    const matchesSupplier = filterSupplier === "" || order.supplier_id._id === filterSupplier
    return matchesStatus && matchesSupplier
  })

  const statusColors = {
    PENDING: "#ffc107",
    ORDERED: "#17a2b8",
    DELIVERED: "#28a745",
    CANCELLED: "#dc3545"
  }

  const calculateOrderTotal = (items) => {
    return items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  }

  return (
    <div className="purchase-orders-container">
      <div className="po-header">
        <h1>Purchase Orders</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ Create Order"}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <div className="po-form-container">
          <h2>Create New Purchase Order</h2>
          <form onSubmit={handleSubmit} className="po-form">
            <div className="form-section">
              <h3>Order Details</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Supplier *</label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    required
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier._id} value={supplier._id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Expected Delivery Date</label>
                  <input
                    type="date"
                    value={formData.expected_delivery_date}
                    onChange={(e) =>
                      setFormData({ ...formData, expected_delivery_date: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Items</h3>
              {products.length === 0 && (
                <div style={{ padding: "15px", background: "#fff3cd", border: "1px solid #ffc107", borderRadius: "6px", marginBottom: "15px", color: "#856404" }}>
                  ⚠️ No products available. Please create products first before creating a purchase order.
                </div>
              )}
              {formData.items.map((item, index) => (
                <div key={index} className="item-row">
                  <div className="form-group">
                    <label>Product {products.length === 0 && "(No products available)"}</label>
                    <select
                      value={item.product_id || ""}
                      disabled={products.length === 0}
                      onChange={(e) => {
                        const selectedId = e.target.value
                        const product = getProductDetails(selectedId)
                        console.log("Product selected - updating form with:", { selectedId, product })
                        
                        // Update both product_id and unit_price at once
                        const newItems = [...formData.items]
                        newItems[index] = {
                          ...newItems[index],
                          product_id: selectedId,
                          unit_price: product ? product.cost_price : newItems[index].unit_price
                        }
                        setFormData({ ...formData, items: newItems })
                        console.log("Form updated with new items:", newItems)
                      }}
                    >
                      <option value="">Select Product</option>
                      {products.map((product) => (
                        <option key={product._id} value={product._id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Unit Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) =>
                        handleItemChange(index, "unit_price", parseFloat(e.target.value))
                      }
                    />
                  </div>
                  <div className="form-group total">
                    <label>Total</label>
                    <div className="total-value">
                      ₹{(item.quantity * item.unit_price).toFixed(2)}
                    </div>
                  </div>
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      className="btn-remove"
                      onClick={() => removeItem(index)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button type="button" className="btn-add-item" onClick={addItem}>
                + Add Item
              </button>
            </div>

            <div className="form-section">
              <h3>Notes</h3>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows="4"
                placeholder="Any additional notes..."
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                Create Order
              </button>
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="po-filters">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="filter-select"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="ORDERED">Ordered</option>
          <option value="DELIVERED">Delivered</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

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
      </div>

      {loading ? (
        <div className="loading">Loading orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="no-data">No purchase orders found</div>
      ) : (
        <div className="po-list">
          {filteredOrders.map((order) => (
            <div key={order._id} className="po-card">
              <div className="po-header-row">
                <div>
                  <h3>{order.order_number}</h3>
                  <p className="supplier-name">
                    Supplier: <strong>{order.supplier_id.name}</strong>
                  </p>
                </div>
                <div className="po-right">
                  <span
                    className="status-badge"
                    style={{ backgroundColor: statusColors[order.status] }}
                  >
                    {order.status}
                  </span>
                  <span className="order-amount">₹{order.total_amount.toFixed(2)}</span>
                </div>
              </div>

              <div className="po-items">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.product_name}</td>
                        <td>{item.quantity}</td>
                        <td>₹{item.unit_price.toFixed(2)}</td>
                        <td>₹{item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="po-timeline">
                <div className="timeline-item">
                  <span className="label">Created:</span>
                  <span className="value">
                    {order.createdAt ? 
                      new Date(order.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 
                      'Not set'
                    }
                  </span>
                </div>
                {order.expected_delivery_date && (
                  <div className="timeline-item">
                    <span className="label">Expected Delivery:</span>
                    <span className="value">
                      {new Date(order.expected_delivery_date).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                )}
                {order.received_date && (
                  <div className="timeline-item">
                    <span className="label">Received:</span>
                    <span className="value">
                      {new Date(order.received_date).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                )}
              </div>

              <div className="po-actions">
                {order.status === "PENDING" && (
                  <button
                    className="btn-status"
                    onClick={() => handleStatusChange(order._id, "ORDERED")}
                    style={{ backgroundColor: "#17a2b8" }}
                  >
                    Mark as Ordered
                  </button>
                )}
                {order.status === "ORDERED" && (
                  <button
                    className="btn-status"
                    onClick={() => handleStatusChange(order._id, "DELIVERED")}
                    style={{ backgroundColor: "#28a745" }}
                  >
                    Mark as Delivered
                  </button>
                )}
                {(order.status === "PENDING" || order.status === "CANCELLED") && (
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(order._id)}
                  >
                    Delete
                  </button>
                )}
              </div>

              {order.notes && (
                <div className="po-notes">
                  <strong>Notes:</strong> {order.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PurchaseOrders

