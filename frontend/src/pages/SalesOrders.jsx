import React, { useState, useEffect } from 'react';
import api from '../services/apiClient';
import '../styles/salesOrders.css';

const SalesOrders = () => {
  const [salesOrders, setSalesOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [cart, setCart] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [filters, setFilters] = useState({
    status: '',
    customer_name: '',
    page: 1
  });
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    fetchSalesOrders();
    fetchProducts();
  }, [filters.page, filters.status, filters.customer_name]);

  const fetchSalesOrders = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.customer_name) queryParams.append('customer_name', filters.customer_name);
      queryParams.append('page', filters.page);
      queryParams.append('limit', '10');

      const response = await api.get(`/sales-orders?${queryParams.toString()}`);
      // Handle both wrapped and unwrapped responses
      const ordersData = response?.data || response || [];
      const paginationData = response?.pagination || {};
      setSalesOrders(Array.isArray(ordersData) ? ordersData : []);
      setPagination(paginationData);
    } catch (error) {
      console.error('❌ Error fetching sales orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      // apiService returns unwrapped data
      const productsData = Array.isArray(response) ? response : (response?.data || response || []);
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (error) {
      console.error('❌ Error fetching products:', error);
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.product_id === product._id);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.product_id === product._id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product._id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.selling_price || 0,
        max_stock: product.current_stock
      }]);
    }
  };

  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(cart.map(item =>
      item.product_id === productId
        ? { ...item, quantity: Math.min(newQuantity, item.max_stock) }
        : item
    ));
  };

  const updateCartPrice = (productId, newPrice) => {
    setCart(cart.map(item =>
      item.product_id === productId
        ? { ...item, unit_price: Math.max(0, newPrice) }
        : item
    ));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerInfo({ name: '', email: '', phone: '', address: '' });
  };

  const calculateCartTotal = () => {
    return cart.reduce((total, item) => total + (item.quantity * item.unit_price), 0);
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    
    if (!customerInfo.name.trim()) {
      alert('Customer name is required');
      return;
    }
    
    if (cart.length === 0) {
      alert('Please add at least one item to the cart');
      return;
    }

    try {
      setLoading(true);
      
      const orderData = {
        customer_info: customerInfo,
        items: cart,
        payment_method: 'CASH',
        notes: '',
        discount_amount: 0,
        tax_amount: 0
      };

      const response = await api.post('/sales-orders', orderData);
      
      alert(`✅ ${response.data.message}`);
      clearCart();
      setShowCreateForm(false);
      fetchSalesOrders();
    } catch (error) {
      console.error('❌ Error creating order:', error);
      alert(error.response?.data?.message || 'Failed to create sales order');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      setLoading(true);
      
      const response = await api.patch(`/sales-orders/${orderId}/status`, {
        status: newStatus
      });
      
      alert(`✅ Order status updated to ${newStatus}`);
      fetchSalesOrders();
    } catch (error) {
      console.error('❌ Error updating status:', error);
      alert(error.response?.data?.message || 'Failed to update order status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      DRAFT: 'badge-draft',
      CONFIRMED: 'badge-confirmed',
      PROCESSING: 'badge-processing',
      COMPLETED: 'badge-completed',
      CANCELLED: 'badge-cancelled'
    };
    
    return `badge ${statusColors[status] || 'badge-default'}`;
  };

  return (
    <div className="sales-orders">
      <div className="sales-orders-header">
        <div className="header-info">
          <h2>📋 Sales Orders</h2>
          <p>Manage multi-item sales orders with cart functionality</p>
        </div>
        <button 
          onClick={() => setShowCreateForm(true)}
          className="btn-primary"
          disabled={loading}
        >
          ➕ New Sales Order
        </button>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Status:</label>
            <select 
              value={filters.status} 
              onChange={(e) => setFilters({...filters, status: e.target.value, page: 1})}
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Customer:</label>
            <input
              type="text"
              placeholder="Search by customer name"
              value={filters.customer_name}
              onChange={(e) => setFilters({...filters, customer_name: e.target.value, page: 1})}
            />
          </div>
        </div>
      </div>

      {/* Sales Orders List */}
      <div className="sales-orders-list">
        {loading && <div className="loading">⏳ Loading sales orders...</div>}
        
        {!loading && salesOrders.length === 0 && (
          <div className="no-data">📄 No sales orders found</div>
        )}

        {!loading && salesOrders.map(order => (
          <div key={order._id} className="order-card">
            <div className="order-header">
              <div className="order-info">
                <h3>{order.order_number}</h3>
                <p className="customer-name">👤 {order.customer_info.name}</p>
                {order.customer_info.phone && <p className="customer-phone">📱 {order.customer_info.phone}</p>}
                <p className="order-date">📅 {new Date(order.order_date).toLocaleDateString()}</p>
              </div>
              <div className="order-status">
                <span className={getStatusBadge(order.status)}>{order.status}</span>
                <div className="order-total">💰 ${order.total_amount.toLocaleString()}</div>
              </div>
            </div>
            
            <div className="order-items">
              <h4>📦 Items ({order.items.length})</h4>
              <div className="items-list">
                {order.items.map((item, index) => (
                  <div key={index} className="item-row">
                    <span className="item-name">{item.product_name}</span>
                    <span className="item-quantity">×{item.quantity}</span>
                    <span className="item-price">${item.unit_price.toFixed(2)}</span>
                    <span className="item-total">${item.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="order-actions">
              {order.status === 'DRAFT' && (
                <button 
                  onClick={() => updateOrderStatus(order._id, 'CONFIRMED')}
                  className="btn-success btn-sm"
                >
                  ✅ Confirm
                </button>
              )}
              {order.status === 'CONFIRMED' && (
                <button 
                  onClick={() => updateOrderStatus(order._id, 'PROCESSING')}
                  className="btn-warning btn-sm"
                >
                  🔄 Process
                </button>
              )}
              {order.status === 'PROCESSING' && (
                <button 
                  onClick={() => updateOrderStatus(order._id, 'COMPLETED')}
                  className="btn-primary btn-sm"
                >
                  📦 Complete
                </button>
              )}
              {['DRAFT', 'CONFIRMED'].includes(order.status) && (
                <button 
                  onClick={() => updateOrderStatus(order._id, 'CANCELLED')}
                  className="btn-danger btn-sm"
                >
                  ❌ Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => setFilters({...filters, page: filters.page - 1})}
            disabled={filters.page === 1}
            className="btn-secondary"
          >
            ← Previous
          </button>
          <span>Page {filters.page} of {pagination.total_pages}</span>
          <button 
            onClick={() => setFilters({...filters, page: filters.page + 1})}
            disabled={filters.page === pagination.total_pages}
            className="btn-secondary"
          >
            Next →
          </button>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal-content large">
            <div className="modal-header">
              <h3>🛒 Create New Sales Order</h3>
              <button onClick={() => setShowCreateForm(false)} className="btn-close">×</button>
            </div>
            
            <form onSubmit={handleCreateOrder}>
              {/* Customer Information */}
              <div className="section">
                <h4>👤 Customer Information</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Address</label>
                    <input
                      type="text"
                      value={customerInfo.address}
                      onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Product Selection */}
              <div className="section">
                <h4>📦 Add Products</h4>
                <div className="products-grid">
                  {products.map(product => (
                    <div key={product._id} className="product-card">
                      <h5>{product.name}</h5>
                      <p className="product-sku">SKU: {product.sku}</p>
                      <p className="product-price">${product.selling_price?.toFixed(2) || '0.00'}</p>
                      <p className="product-stock">Stock: {product.current_stock}</p>
                      <button 
                        type="button"
                        onClick={() => addToCart(product)}
                        disabled={product.current_stock === 0}
                        className="btn-sm btn-primary"
                      >
                        🛒 Add to Cart
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shopping Cart */}
              <div className="section">
                <h4>🛒 Shopping Cart ({cart.length} items)</h4>
                {cart.length === 0 ? (
                  <p className="empty-cart">Cart is empty. Add products above.</p>
                ) : (
                  <div className="cart-items">
                    {cart.map(item => (
                      <div key={item.product_id} className="cart-item">
                        <div className="item-info">
                          <h5>{item.product_name}</h5>
                          <small>Max available: {item.max_stock}</small>
                        </div>
                        <div className="item-controls">
                          <div className="quantity-control">
                            <label>Qty:</label>
                            <input
                              type="number"
                              min="1"
                              max={item.max_stock}
                              value={item.quantity}
                              onChange={(e) => updateCartQuantity(item.product_id, parseInt(e.target.value))}
                            />
                          </div>
                          <div className="price-control">
                            <label>Price:</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => updateCartPrice(item.product_id, parseFloat(e.target.value))}
                            />
                          </div>
                          <div className="item-total">
                            ${(item.quantity * item.unit_price).toFixed(2)}
                          </div>
                          <button 
                            type="button"
                            onClick={() => removeFromCart(item.product_id)}
                            className="btn-danger btn-sm"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="cart-total">
                      <strong>Total: ${calculateCartTotal().toFixed(2)}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="form-actions">
                <button type="button" onClick={clearCart} className="btn-secondary">
                  🗑️ Clear Cart
                </button>
                <button type="button" onClick={() => setShowCreateForm(false)} className="btn-secondary">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading || cart.length === 0 || !customerInfo.name.trim()}
                  className="btn-primary"
                >
                  {loading ? '⏳ Creating...' : '✅ Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesOrders;