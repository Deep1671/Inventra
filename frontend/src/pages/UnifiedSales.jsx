import React, { useState, useEffect } from 'react';
import api from '../services/apiClient';
import SalesDashboard from '../components/SalesDashboard';
import '../styles/unifiedSales.css';

const UnifiedSales = () => {
  // State management
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({});
  
  // Modal state for order details
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  
  // UI States
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'list', 'create'
  const [filters, setFilters] = useState({
    status: '',
    customer_name: '',
    order_type: '', // 'single', 'multi', ''
    page: 1
  });
  
  // Product selection for dropdown
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  
  // Multi-item Order Form (now handles all sales)
  const [cart, setCart] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({
    name: 'Walk-in Customer',
    email: '',
    phone_country_code: '+91',
    phone: '',
    address: ''
  });

  const normalizeCountryCode = (code = '') => {
    const digits = code.replace(/\D/g, '').slice(0, 4);
    return digits ? `+${digits}` : '';
  };

  const normalizePhoneDigits = (phone = '') => phone.replace(/\D/g, '').slice(0, 15);

  const buildFullPhoneNumber = (countryCode, phone) => {
    const normalizedCountryCode = normalizeCountryCode(countryCode);
    const normalizedPhone = normalizePhoneDigits(phone);
    const countryDigits = normalizedCountryCode.replace(/\D/g, '');

    if (!normalizedPhone) {
      return '';
    }

    if (countryDigits && normalizedPhone.startsWith(countryDigits) && normalizedPhone.length > countryDigits.length + 6) {
      return `+${normalizedPhone}`;
    }

    return normalizedCountryCode
      ? `${normalizedCountryCode}${normalizedPhone}`
      : normalizedPhone;
  };

  useEffect(() => {
    fetchSales();
    fetchProducts();
  }, [filters.page, filters.status, filters.customer_name, filters.order_type]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.customer_name) queryParams.append('customer_name', filters.customer_name);
      if (filters.order_type) queryParams.append('order_type', filters.order_type);
      queryParams.append('page', filters.page);
      queryParams.append('limit', '10');

      const response = await api.get(`/sales?${queryParams.toString()}`);
      
      // Handle both wrapped and unwrapped responses
      const salesData = response?.data || response || [];
      const paginationData = response?.pagination || {};
      
      setSales(Array.isArray(salesData) ? salesData : []);
      setPagination(paginationData);
    } catch (error) {
      console.error('❌ Error fetching sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      console.log('Fetching products...');
      const response = await api.get('/products');
      console.log('Full API response:', response);
      
      // apiService returns unwrapped data, not axios response
      // response could be an array directly or wrapped in data property
      const productsData = Array.isArray(response) 
        ? response 
        : (response?.data || response || []);
      
      console.log('Processed products data:', productsData);
      
      if (Array.isArray(productsData)) {
        setProducts(productsData);
        console.log('✅ Products set successfully:', productsData.length, 'products');
      } else {
        console.log('⚠️ Products data is not an array:', typeof productsData);
        setProducts([]);
      }
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        console.error('Backend server is not running');
        alert('Backend server is not running. Please start the server.');
      } else if (error.response?.status === 401) {
        console.error('Authentication error - user not logged in');
        alert('Please log in to view products');
      } else if (error.response?.status === 403) {
        console.error('Authorization error - insufficient permissions');
        alert('You do not have permission to view products');
      } else {
        console.error('API Error details:', error.response?.data);
        console.error('Full error:', error);
      }
      
      setProducts([]);
    }
  };

  // Quick Sale Functions
  // Handle adding selected product from dropdown
  const handleAddSelectedProduct = () => {
    if (!selectedProductId) {
      alert('Please select a product');
      return;
    }

    const product = products.find(p => p._id === selectedProductId);
    if (!product) {
      alert('Selected product not found');
      return;
    }

    if (product.current_stock <= 0) {
      alert('This product is out of stock');
      return;
    }

    if (selectedQuantity <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    if (selectedQuantity > product.current_stock) {
      alert(`Only ${product.current_stock} units available in stock`);
      return;
    }

    // Check if product already exists in cart
    const existingItem = cart.find(item => item.product_id === selectedProductId);
    
    if (existingItem) {
      const newQuantity = existingItem.quantity + selectedQuantity;
      if (newQuantity > product.current_stock) {
        alert(`Cannot add ${selectedQuantity} more units. Maximum available: ${product.current_stock - existingItem.quantity}`);
        return;
      }
      
      setCart(cart.map(item =>
        item.product_id === selectedProductId
          ? { ...item, quantity: newQuantity }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product._id,
        product_name: product.name,
        quantity: selectedQuantity,
        unit_price: product.selling_price || 0,
        max_stock: product.current_stock
      }]);
    }

    // Reset selection
    setSelectedProductId('');
    setSelectedQuantity(1);
    
    // Show success message
    alert(`✅ Added ${selectedQuantity} x ${product.name} to cart`);
  };

  // Unified Create Sale Function
  const handleCreateOrder = async () => {
    if (!customerInfo.name.trim()) {
      alert('Customer name is required');
      return;
    }
    
    // Email or Phone validation
    const hasEmail = customerInfo.email.trim() !== '';
    const hasPhone = customerInfo.phone.trim() !== '';
    
    if (!hasEmail && !hasPhone) {
      alert('Either email or phone number is required');
      return;
    }
    
    // Email validation regex
    if (hasEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerInfo.email.trim())) {
        alert('Please enter a valid email address (e.g., user@example.com)');
        return;
      }
    }
    
    // Phone validation - allow international length
    if (hasPhone) {
      const normalizedPhone = normalizePhoneDigits(customerInfo.phone);
      if (normalizedPhone.length < 7 || normalizedPhone.length > 15) {
        alert('Phone number must be between 7 and 15 digits');
        return;
      }
    }
    
    // Address validation
    if (!customerInfo.address.trim()) {
      alert('Address is required');
      return;
    }
    
    if (cart.length === 0) {
      alert('Please add at least one product to the cart');
      return;
    }

    const normalizedCustomerInfo = {
      ...customerInfo,
      phone_country_code: normalizeCountryCode(customerInfo.phone_country_code) || '+91',
      phone: buildFullPhoneNumber(customerInfo.phone_country_code, customerInfo.phone)
    };

    // Validate all items have valid quantities
    const invalidItems = cart.filter(item => !item.quantity || item.quantity < 1);
    if (invalidItems.length > 0) {
      alert('All items must have a quantity of 1 or more');
      return;
    }

    try {
      setLoading(true);
      
      // Use appropriate endpoint based on cart size and complexity
      if (cart.length === 1 && !customerInfo.email && !customerInfo.phone) {
        // Simple single-item sale - use quick sale endpoint
        const saleData = {
          product_id: cart[0].product_id,
          quantity_sold: cart[0].quantity,
          customer_name: customerInfo.name.trim(),
          customer_info: normalizedCustomerInfo
        };
        const response = await api.post('/sales/quick', saleData);
        const message = response?.message || response?.data?.message || '✅ Sale created successfully';
        alert(message);
      } else {
        // Multi-item order or complex sale
        const orderData = {
          customer_info: normalizedCustomerInfo,
          items: cart,
          payment_method: 'CASH',
          notes: '',
          discount_amount: 0,
          tax_amount: 0
        };
        const response = await api.post('/sales/orders', orderData);
        const message = response?.message || response?.data?.message || '✅ Order created successfully';
        alert(message);
      }
      
      clearCart();
      setCustomerInfo({ name: 'Walk-in Customer', email: '', phone_country_code: '+91', phone: '', address: '' });
      setActiveTab('list');
      fetchSales();
    } catch (error) {
      console.error('❌ Error creating sale:', error);
      alert(error.response?.data?.message || 'Failed to create sale');
    } finally {
      setLoading(false);
    }
  };

  // Cart Functions for Multi-item Orders
  const addToCart = (product) => {
    console.log('Adding product to cart:', product);
    
    if (!product || !product._id) {
      console.error('Invalid product data:', product);
      alert('Error: Invalid product data');
      return;
    }

    if (product.current_stock <= 0) {
      alert('This product is out of stock');
      return;
    }

    const existingItem = cart.find(item => item.product_id === product._id);
    
    if (existingItem) {
      console.log('Product already in cart, increasing quantity');
      setCart(cart.map(item =>
        item.product_id === product._id
          ? { ...item, quantity: Math.min(item.quantity + 1, item.max_stock) }
          : item
      ));
    } else {
      console.log('Adding new product to cart');
      const newItem = {
        product_id: product._id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.selling_price || 0,
        max_stock: product.current_stock
      };
      console.log('New cart item:', newItem);
      setCart([...cart, newItem]);
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
    setCustomerInfo({ name: '', email: '', phone_country_code: '+91', phone: '', address: '' });
  };

  const calculateCartTotal = () => {
    return cart.reduce((total, item) => total + (item.quantity * item.unit_price), 0);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      setLoading(true);
      
      console.log(`🔄 Updating order ${orderId} to status: ${newStatus}`);
      
      const response = await api.patch(`/sales/orders/${orderId}/status`, {
        status: newStatus
      });
      
      console.log('✅ Status update response:', response);
      alert(`✅ Order status updated to ${newStatus}`);
      fetchSales();
    } catch (error) {
      console.error('❌ Error updating status:', error);
      console.error('Error details:', error.response?.data);
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

  // Show order details modal
  const showOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  // Close order details modal
  const closeOrderModal = () => {
    setShowOrderModal(false);
    setSelectedOrder(null);
  };

  return (
    <div className="sales-container">
      <div className="sales-header">
        <h1>💰 Sales Management</h1>
        <button 
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button 
          className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          📋 All Sales
        </button>
        <button 
          className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          ➕ Create Sale
        </button>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <SalesDashboard />
      )}

      {/* Sales List Tab */}
      {activeTab === 'list' && (
        <div className="sales-card-container">
          {/* Filters */}
          <div className="filters-section">
            <h2>Filter Sales</h2>
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
              <div className="filter-group">
                <label>Type:</label>
                <select 
                  value={filters.order_type} 
                  onChange={(e) => setFilters({...filters, order_type: e.target.value, page: 1})}
                >
                  <option value="">All Types</option>
                  <option value="single">Quick Sales</option>
                  <option value="multi">Multi-Item Orders</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sales List */}
          <div className="sales-list">
            {loading && <div className="loading">⏳ Loading sales...</div>}
            
            {!loading && sales.length === 0 && (
              <div className="no-data">📄 No sales found</div>
            )}

            {!loading && sales.map(sale => {
              // Safe date formatting
              const formatDate = (dateStr) => {
                if (!dateStr) return 'N/A';
                try {
                  const date = new Date(dateStr);
                  if (isNaN(date.getTime())) return 'N/A';
                  return date.toLocaleDateString('en-IN', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit' 
                  });
                } catch (e) {
                  return 'N/A';
                }
              };

              const displayDate = sale.order_date || sale.createdAt;
              const displayTotal = sale.total_amount || 0;

              return (
              <div 
                key={sale._id} 
                className="sale-item"
                onClick={() => showOrderDetails(sale)}
                style={{ cursor: 'pointer' }}
              >
                <div className="sale-info">
                  <h4>{sale.order_number || 'Unknown'}</h4>
                  <p>👤 {sale.customer_name || 'N/A'}</p>
                  {sale.customer_info?.phone && <p>📱 {sale.customer_info.phone}</p>}
                  <p>📅 {formatDate(displayDate)}</p>
                </div>
                
                <div className="sale-details">
                  <span className={getStatusBadge(sale.status)}>{sale.status}</span>
                  <span className="sale-total">💰 ₹{displayTotal.toLocaleString()}</span>
                </div>
                
                <div className="sale-actions">
                  {sale.status === 'DRAFT' && (
                    <button 
                      onClick={() => updateOrderStatus(sale._id, 'CONFIRMED')}
                      className="btn-primary btn-sm"
                    >
                      ✓ Confirm
                    </button>
                  )}
                  {sale.status === 'CONFIRMED' && (
                    <button 
                      onClick={() => updateOrderStatus(sale._id, 'PROCESSING')}
                      className="btn-primary btn-sm"
                    >
                      ⚙ Process
                    </button>
                  )}
                  {sale.status === 'PROCESSING' && (
                    <button 
                      onClick={() => updateOrderStatus(sale._id, 'COMPLETED')}
                      className="btn-primary btn-sm"
                    >
                      📦 Complete
                    </button>
                  )}
                  {['DRAFT', 'CONFIRMED'].includes(sale.status) && (
                    <button 
                      onClick={() => updateOrderStatus(sale._id, 'CANCELLED')}
                      className="btn-danger btn-sm"
                    >
                      ❌ Cancel
                    </button>
                  )}
                </div>
              </div>
            );
            })}
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
        </div>
      )}

      {/* Unified Create Sale Tab */}
      {activeTab === 'create' && (
        <div className="sales-card-container">
          <h2>Create New Sale</h2>
          <div className="sale-form">
            {/* Customer Information */}
            <div className="form-section">
              <h4>👤 Customer Information</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                    placeholder="Customer name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email (optional)</label>
                  <input
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="form-group phone-group">
                  <label>Phone *</label>
                  <div className="phone-input-wrapper">
                    <input
                      type="text"
                      value={customerInfo.phone_country_code}
                      onChange={(e) => {
                        const value = normalizeCountryCode(e.target.value);
                        setCustomerInfo({...customerInfo, phone_country_code: value || '+91'});
                      }}
                      placeholder="+91"
                      className="country-code-input"
                      maxLength="5"
                    />
                    <input
                      type="tel"
                      value={customerInfo.phone}
                      onChange={(e) => {
                        const rawValue = e.target.value;
                        const normalizedDigits = normalizePhoneDigits(rawValue);

                        if (rawValue.trim().startsWith('+')) {
                          const countryMatch = rawValue.match(/^\+\s*(\d{1,4})/);
                          if (countryMatch) {
                            const parsedCountryCode = `+${countryMatch[1]}`;
                            const localPhone = normalizedDigits.startsWith(countryMatch[1])
                              ? normalizedDigits.slice(countryMatch[1].length)
                              : normalizedDigits;

                            setCustomerInfo({
                              ...customerInfo,
                              phone_country_code: parsedCountryCode,
                              phone: localPhone
                            });
                            return;
                          }
                        }

                        setCustomerInfo({...customerInfo, phone: normalizedDigits});
                      }}
                      placeholder="Phone number"
                      maxLength="15"
                    />
                  </div>
                  <small className="phone-helper">Examples: +91 (India), +1 (USA), +44 (UK), +61 (Australia)</small>
                </div>
                <div className="form-group">
                  <label>Address *</label>
                  <input
                    type="text"
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                    placeholder="Delivery address (required)"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Product Selection */}
            <div className="form-section">
              <h4>🛍️ Add Products</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Select Product *</label>
                  <select 
                    value={selectedProductId} 
                    onChange={(e) => {
                      const product = products.find(p => p._id === e.target.value);
                      setSelectedProductId(e.target.value);
                      if (product) {
                        console.log('Found product:', product);
                        addToCart(product);
                      }
                    }}
                    className="product-dropdown"
                  >
                    <option value="">-- Select a product --</option>
                    {products.map(product => (
                      <option key={product._id} value={product._id}>
                        {product.name} (Stock: {product.current_stock}) - ₹{product.selling_price}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Shopping Cart */}
            <div className="form-section">
              <h4>🛒 Shopping Cart</h4>
              {cart.length === 0 ? (
                <p className="empty-cart">No items in cart</p>
              ) : (
                <>
                  <div className="cart-table">
                    <div className="cart-header">
                      <div>Product</div>
                      <div>Qty</div>
                      <div>Price</div>
                      <div>Total</div>
                      <div></div>
                    </div>
                    {cart.map((item, idx) => (
                      <div key={idx} className="cart-row">
                        <div>{item.product_name}</div>
                        <div>
                          <input 
                            type="number" 
                            min="1" 
                            value={item.quantity}
                            onChange={(e) => {
                              const newCart = [...cart];
                              const value = e.target.value;
                              newCart[idx].quantity = value === '' ? '' : Math.max(1, parseInt(value) || 1);
                              setCart(newCart);
                            }}
                            onBlur={(e) => {
                              if (e.target.value === '' || parseInt(e.target.value) < 1) {
                                const newCart = [...cart];
                                newCart[idx].quantity = 1;
                                setCart(newCart);
                              }
                            }}
                            className="qty-input"
                            placeholder="1"
                          />
                        </div>
                        <div>₹{item.unit_price}</div>
                        <div>₹{(item.quantity * item.unit_price).toLocaleString()}</div>
                        <div>
                          <button 
                            type="button"
                            onClick={() => removeFromCart(idx)}
                            className="btn-danger btn-sm"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="cart-summary">
                    <div className="summary-row">
                      <span>Subtotal:</span>
                      <span>₹{calculateCartTotal().toLocaleString()}</span>
                    </div>
                    <div className="summary-row total">
                      <span>Total:</span>
                      <span>₹{calculateCartTotal().toLocaleString()}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Form Actions */}
            <div className="form-actions">
              <button type="button" onClick={handleCreateOrder} className="btn-primary" disabled={loading || cart.length === 0}>
                {loading ? '⏳ Creating...' : '✓ Create Sale'}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  clearCart();
                  setCustomerInfo({ name: 'Walk-in Customer', email: '', phone_country_code: '+91', phone: '', address: '' });
                }} 
                className="btn-secondary"
              >
                🔄 Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ORDER DETAILS MODAL */}
      {showOrderModal && selectedOrder && (
        <div className="modal-overlay" onClick={closeOrderModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Order Details</h2>
              <button className="modal-close" onClick={closeOrderModal}>✕</button>
            </div>

            <div className="modal-body">
              {/* Order Info */}
              <div className="order-section">
                <h3>📋 Order Information</h3>
                <div className="info-grid">
                  <div className="info-row">
                    <span className="info-label">Order Number:</span>
                    <span className="info-value">{selectedOrder.order_number}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Status:</span>
                    <span className={`badge ${selectedOrder.status?.toLowerCase()}`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Order Date:</span>
                    <span className="info-value">
                      {new Date(selectedOrder.order_date || selectedOrder.createdAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Order Type:</span>
                    <span className="info-value">{selectedOrder.type || 'Sales Order'}</span>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="order-section">
                <h3>👤 Customer Information</h3>
                <div className="info-grid">
                  <div className="info-row">
                    <span className="info-label">Name:</span>
                    <span className="info-value">{selectedOrder.customer_name}</span>
                  </div>
                  {selectedOrder.customer_info?.email && (
                    <div className="info-row">
                      <span className="info-label">Email:</span>
                      <span className="info-value">{selectedOrder.customer_info.email}</span>
                    </div>
                  )}
                  {selectedOrder.customer_info?.phone && (
                    <div className="info-row">
                      <span className="info-label">Phone:</span>
                      <span className="info-value">{selectedOrder.customer_info.phone}</span>
                    </div>
                  )}
                  {selectedOrder.customer_info?.address && (
                    <div className="info-row">
                      <span className="info-label">Address:</span>
                      <span className="info-value">{selectedOrder.customer_info.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Items */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="order-section">
                  <h3>📦 Order Items</h3>
                  <div className="items-table">
                    <div className="items-header">
                      <div className="col-product">Product</div>
                      <div className="col-qty">Qty</div>
                      <div className="col-price">Unit Price</div>
                      <div className="col-subtotal">Subtotal</div>
                    </div>
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="items-row">
                        <div className="col-product">{item.product_name}</div>
                        <div className="col-qty">{item.quantity}</div>
                        <div className="col-price">₹{item.unit_price?.toLocaleString()}</div>
                        <div className="col-subtotal">
                          ₹{(item.quantity * item.unit_price)?.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Info */}
              <div className="order-section">
                <h3>💳 Payment Information</h3>
                <div className="info-grid">
                  <div className="info-row">
                    <span className="info-label">Payment Method:</span>
                    <span className="info-value">{selectedOrder.payment_method || 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Payment Status:</span>
                    <span className="info-value">{selectedOrder.payment_status || 'N/A'}</span>
                  </div>
                  <div className="info-row total-row">
                    <span className="info-label">Total Amount:</span>
                    <span className="info-value total-amount">₹{selectedOrder.total_amount?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div className="order-section">
                  <h3>📝 Notes</h3>
                  <p className="notes-text">{selectedOrder.notes}</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-primary" onClick={closeOrderModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedSales;