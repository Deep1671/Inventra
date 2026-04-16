const nodemailer = require("nodemailer")

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }

  async sendEmail(to, subject, htmlContent, attachments = []) {
    try {
      console.log(`📧 Sending email to: ${to}`);
      console.log(`📧 Subject: ${subject}`);

      const mailOptions = {
        from: `"${process.env.COMPANY_NAME || 'Smart Inventory'}" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html: htmlContent,
        attachments
      }

      const result = await this.transporter.sendMail(mailOptions)
      console.log(`✅ Email sent successfully: ${result.messageId}`)
      return result
    } catch (error) {
      console.error(`❌ Email sending failed:`, error)
      throw error
    }
  }

  generatePurchaseOrderEmail(purchaseOrder, supplier) {
    const itemsHtml = purchaseOrder.items.map(item => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.product_name || 'Product'}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₹${item.unit_price?.toFixed(2) || '0.00'}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₹${item.total?.toFixed(2) || '0.00'}</td>
      </tr>
    `).join('')

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Purchase Order - ${purchaseOrder.order_number}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #2c5aa0; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .order-info { background: #f4f4f4; padding: 15px; margin: 20px 0; border-radius: 5px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #2c5aa0; color: white; padding: 12px; text-align: left; }
          .total-row { background: #f0f0f0; font-weight: bold; }
          .footer { background: #f4f4f4; padding: 15px; text-align: center; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Purchase Order</h1>
          <h2>${purchaseOrder.order_number}</h2>
        </div>
        
        <div class="content">
          <div class="order-info">
            <h3>Order Details</h3>
            <p><strong>Order Number:</strong> ${purchaseOrder.order_number}</p>
            <p><strong>Date:</strong> ${new Date(purchaseOrder.createdAt || Date.now()).toLocaleDateString('en-IN')}</p>
            <p><strong>Supplier:</strong> ${supplier.name}</p>
            <p><strong>Status:</strong> ${purchaseOrder.status}</p>
            ${purchaseOrder.expected_delivery_date ? `<p><strong>Expected Delivery:</strong> ${new Date(purchaseOrder.expected_delivery_date).toLocaleDateString('en-IN')}</p>` : ''}
          </div>

          <h3>Items Ordered</h3>
          <table style="border: 1px solid #ddd;">
            <thead>
              <tr>
                <th>Product</th>
                <th style="text-align: center;">Quantity</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr class="total-row">
                <td colspan="3" style="padding: 12px; border: 1px solid #ddd; text-align: right;">
                  <strong>Grand Total:</strong>
                </td>
                <td style="padding: 12px; border: 1px solid #ddd; text-align: right;">
                  <strong>₹${purchaseOrder.total_amount?.toFixed(2) || '0.00'}</strong>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="order-info">
            <h3>Delivery Information</h3>
            <p><strong>Delivery Address:</strong><br>
            ${process.env.COMPANY_ADDRESS || 'Smart Inventory Management<br>123 Business Street<br>City, State - 000000'}</p>
            ${purchaseOrder.notes ? `<p><strong>Notes:</strong> ${purchaseOrder.notes}</p>` : ''}
          </div>
        </div>

        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Contact us: ${process.env.COMPANY_EMAIL || 'info@smartinventory.com'} | ${process.env.COMPANY_PHONE || '+91-9999999999'}</p>
        </div>
      </body>
      </html>
    `
  }

  generateLowStockAlertEmail(alerts) {
    const alertsHtml = alerts.map(alert => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${alert.product_name || alert.product}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${alert.current_stock || 0}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${alert.reorder_point || 0}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
          <span style="background: #ff4757; color: white; padding: 4px 8px; border-radius: 3px; font-size: 12px;">
            URGENT
          </span>
        </td>
      </tr>
    `).join('')

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Low Stock Alert</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: #ff4757; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .alert-info { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 5px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #ff4757; color: white; padding: 12px; text-align: left; }
          .footer { background: #f4f4f4; padding: 15px; text-align: center; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚨 Low Stock Alert</h1>
          <p>Immediate Action Required</p>
        </div>
        
        <div class="content">
          <div class="alert-info">
            <h3>⚠️ Stock Alert Summary</h3>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
            <p><strong>Total Items Below Reorder Point:</strong> ${alerts.length}</p>
            <p><strong>Action Required:</strong> Create purchase orders for the following items</p>
          </div>

          <h3>Items Requiring Immediate Attention</h3>
          <table style="border: 1px solid #ddd;">
            <thead>
              <tr>
                <th>Product Name</th>
                <th style="text-align: center;">Current Stock</th>
                <th style="text-align: center;">Reorder Point</th>
                <th style="text-align: center;">Priority</th>
              </tr>
            </thead>
            <tbody>
              ${alertsHtml}
            </tbody>
          </table>

          <div class="alert-info">
            <h3>📋 Recommended Actions</h3>
            <ul>
              <li>Review current stock levels for each product</li>
              <li>Create purchase orders with suppliers immediately</li>
              <li>Consider increasing reorder points for fast-moving items</li>
              <li>Monitor delivery timelines to prevent stockouts</li>
            </ul>
          </div>
        </div>

        <div class="footer">
          <p>This is an automated alert from Smart Inventory Management System</p>
          <p>Please log in to the system to take immediate action</p>
        </div>
      </body>
      </html>
    `
  }

  generateStatusUpdateEmail(purchaseOrder, supplier, oldStatus, newStatus) {
    let statusMessage = ''
    let statusColor = '#2c5aa0'

    switch (newStatus) {
      case 'ORDERED':
        statusMessage = 'Your purchase order has been placed with the supplier.'
        statusColor = '#3742fa'
        break
      case 'DELIVERED':
        statusMessage = 'Your purchase order has been successfully delivered and stock has been updated.'
        statusColor = '#2ed573'
        break
      case 'CANCELLED':
        statusMessage = 'Your purchase order has been cancelled.'
        statusColor = '#ff4757'
        break
      default:
        statusMessage = `Your purchase order status has been updated to ${newStatus}.`
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>PO Status Update - ${purchaseOrder.order_number}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .header { background: ${statusColor}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .status-info { background: #f4f4f4; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { background: #f4f4f4; padding: 15px; text-align: center; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📋 Purchase Order Update</h1>
          <h2>${purchaseOrder.order_number}</h2>
        </div>
        
        <div class="content">
          <div class="status-info">
            <h3>Status Update</h3>
            <p><strong>Order Number:</strong> ${purchaseOrder.order_number}</p>
            <p><strong>Supplier:</strong> ${supplier.name}</p>
            <p><strong>Previous Status:</strong> ${oldStatus}</p>
            <p><strong>New Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${newStatus}</span></p>
            <p><strong>Updated On:</strong> ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}</p>
          </div>

          <p>${statusMessage}</p>

          ${newStatus === 'DELIVERED' ? `
            <div class="status-info">
              <h3>✅ Inventory Updated</h3>
              <p>The following items have been added to your inventory:</p>
              <ul>
                ${purchaseOrder.items.map(item => `
                  <li>${item.product_name}: +${item.quantity} units</li>
                `).join('')}
              </ul>
            </div>
          ` : ''}
        </div>

        <div class="footer">
          <p>Thank you for using Smart Inventory Management System</p>
          <p>Login to view complete order details and manage your inventory</p>
        </div>
      </body>
      </html>
    `
  }

  // Generate daily consolidated supplier email template
  generateDailySupplierEmail(supplier, orders) {
    const totalOrders = orders.length;
    let totalAmount = 0;
    let totalItems = 0;

    orders.forEach(order => {
      totalAmount += order.total_amount || 0;
      totalItems += order.items.length;
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f4f6f9;
          }
          .email-container {
            max-width: 800px;
            margin: 0 auto;
            background-color: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .content {
            padding: 30px;
          }
          .supplier-info {
            background-color: #f8f9ff;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 25px;
            border-left: 4px solid #667eea;
          }
          .summary-stats {
            display: flex;
            justify-content: space-around;
            margin: 25px 0;
            background-color: #fff8f0;
            padding: 20px;
            border-radius: 8px;
          }
          .stat-item {
            text-align: center;
          }
          .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #ff6b35;
          }
          .stat-label {
            font-size: 14px;
            color: #666;
            margin-top: 5px;
          }
          .orders-section {
            margin-top: 30px;
          }
          .order-card {
            border: 1px solid #e0e6ed;
            border-radius: 8px;
            margin-bottom: 20px;
            overflow: hidden;
          }
          .order-header {
            background-color: #f8f9fa;
            padding: 15px 20px;
            border-bottom: 1px solid #e0e6ed;
          }
          .order-number {
            font-weight: bold;
            color: #2c3e50;
          }
          .order-date {
            color: #666;
            font-size: 14px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
          }
          .items-table th,
          .items-table td {
            padding: 12px 20px;
            text-align: left;
            border-bottom: 1px solid #f1f1f1;
          }
          .items-table th {
            background-color: #fafafa;
            font-weight: 600;
            color: #2c3e50;
          }
          .items-table tr:last-child td {
            border-bottom: none;
          }
          .price {
            font-weight: 600;
            color: #27ae60;
          }
          .urgent-note {
            background-color: #fff5f5;
            border: 1px solid #fed7d7;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            color: #742a2a;
          }
          .action-section {
            background-color: #f0f8ff;
            padding: 25px;
            border-radius: 8px;
            margin-top: 30px;
            text-align: center;
          }
          .footer {
            background-color: #2c3e50;
            color: white;
            padding: 20px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>📋 Daily Purchase Orders Summary</h1>
            <p>Consolidated orders for ${new Date().toLocaleDateString()}</p>
          </div>

          <div class="content">
            <div class="supplier-info">
              <h2>📦 Supplier: ${supplier.name}</h2>
              <p><strong>Contact:</strong> ${supplier.contact_person || 'N/A'}</p>
              <p><strong>Phone:</strong> ${supplier.phone || 'N/A'}</p>
              <p><strong>Email:</strong> ${supplier.email || 'N/A'}</p>
            </div>

            <div class="summary-stats">
              <div class="stat-item">
                <div class="stat-number">${totalOrders}</div>
                <div class="stat-label">Purchase Orders</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">${totalItems}</div>
                <div class="stat-label">Total Line Items</div>
              </div>
              <div class="stat-item">
                <div class="stat-number">$${totalAmount.toLocaleString()}</div>
                <div class="stat-label">Total Amount</div>
              </div>
            </div>

            <div class="urgent-note">
              <strong>⏰ Priority Request:</strong> We urgently need these items to maintain our inventory levels. Please prioritize processing and confirm delivery dates.
            </div>

            <div class="orders-section">
              <h3>📋 Order Details</h3>
              ${orders.map(order => `
                <div class="order-card">
                  <div class="order-header">
                    <div class="order-number">Order #${order.order_number}</div>
                    <div class="order-date">Created: ${new Date(order.createdAt).toLocaleDateString()}</div>
                  </div>
                  
                  <table class="items-table">
                    <thead>
                      <tr>
                        <th>Product Name</th>
                        <th>Quantity Needed</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${order.items.map(item => `
                        <tr>
                          <td>${item.product_name}</td>
                          <td><strong>${item.quantity}</strong> units</td>
                          <td class="price">$${(item.unit_price || 0).toFixed(2)}</td>
                          <td class="price">$${(item.total || 0).toFixed(2)}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              `).join('')}
            </div>

            <div class="action-section">
              <h3>🚀 Next Steps</h3>
              <p><strong>Please confirm receipt of this order and provide:</strong></p>
              <ul style="text-align: left; max-width: 400px; margin: 0 auto;">
                <li>✅ Availability confirmation for all items</li>
                <li>📅 Expected delivery date</li>
                <li>🚚 Shipping method and tracking details</li>
                <li>💰 Final pricing confirmation</li>
              </ul>
              <p style="margin-top: 20px; font-weight: bold; color: #e74c3c;">
                🏃‍♂️ <strong>URGENT:</strong> Please respond within 24 hours to avoid stock outages
              </p>
            </div>
          </div>

          <div class="footer">
            <p><strong>${process.env.COMPANY_NAME || 'Smart Inventory Management'}</strong></p>
            <p>This is an automated daily summary of your purchase orders</p>
            <p>For urgent matters, contact us immediately at ${process.env.ADMIN_EMAIL || 'admin@company.com'}</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  // Generate sales order confirmation email for customers
  generateSalesOrderConfirmationEmail(salesOrder) {
    const orderDate = new Date(salesOrder.order_date).toLocaleDateString();
    const itemsTotal = salesOrder.items.reduce((sum, item) => sum + item.subtotal, 0);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f4f6f9;
          }
          .email-container {
            max-width: 700px;
            margin: 0 auto;
            background-color: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          .header {
            background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 600;
          }
          .content {
            padding: 30px;
          }
          .order-summary {
            background-color: #f8f9ff;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 25px;
            border-left: 4px solid #27ae60;
          }
          .customer-info {
            background-color: #fff8f0;
            padding: 15px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .items-table th,
          .items-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #f1f1f1;
          }
          .items-table th {
            background-color: #fafafa;
            font-weight: 600;
            color: #2c3e50;
          }
          .items-table tr:last-child td {
            border-bottom: none;
          }
          .price {
            font-weight: 600;
            color: #27ae60;
          }
          .total-section {
            background-color: #f0f8ff;
            padding: 20px;
            border-radius: 8px;
            margin-top: 20px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 16px;
          }
          .total-row.grand-total {
            border-top: 2px solid #27ae60;
            padding-top: 15px;
            margin-top: 15px;
            font-size: 20px;
            font-weight: bold;
            color: #27ae60;
          }
          .status-badge {
            background: #fff3cd;
            color: #856404;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
            display: inline-block;
          }
          .footer {
            background-color: #2c3e50;
            color: white;
            padding: 20px;
            text-align: center;
          }
          .footer p {
            margin: 5px 0;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>✅ Order Confirmed</h1>
            <p>Thank you for your order!</p>
          </div>

          <div class="content">
            <div class="customer-info">
              <h3>📋 Order Details</h3>
              <p><strong>Order Number:</strong> ${salesOrder.order_number}</p>
              <p><strong>Order Date:</strong> ${orderDate}</p>
              <p><strong>Status:</strong> <span class="status-badge">${salesOrder.status}</span></p>
            </div>

            <div class="order-summary">
              <h3>👤 Customer Information</h3>
              <p><strong>Name:</strong> ${salesOrder.customer_info.name}</p>
              ${salesOrder.customer_info.email ? `<p><strong>Email:</strong> ${salesOrder.customer_info.email}</p>` : ''}
              ${salesOrder.customer_info.phone ? `<p><strong>Phone:</strong> ${salesOrder.customer_info.phone}</p>` : ''}
              ${salesOrder.customer_info.address ? `<p><strong>Address:</strong> ${salesOrder.customer_info.address}</p>` : ''}
            </div>

            <h3>🛒 Order Items</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${salesOrder.items.map(item => `
                  <tr>
                    <td>${item.product_name}</td>
                    <td>${item.quantity}</td>
                    <td class="price">$${item.unit_price.toFixed(2)}</td>
                    <td class="price">$${item.subtotal.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="total-section">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>$${itemsTotal.toFixed(2)}</span>
              </div>
              ${salesOrder.discount_amount > 0 ? `
                <div class="total-row">
                  <span>Discount:</span>
                  <span>-$${salesOrder.discount_amount.toFixed(2)}</span>
                </div>
              ` : ''}
              ${salesOrder.tax_amount > 0 ? `
                <div class="total-row">
                  <span>Tax:</span>
                  <span>$${salesOrder.tax_amount.toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="total-row grand-total">
                <span>Total Amount:</span>
                <span>$${salesOrder.total_amount.toFixed(2)}</span>
              </div>
            </div>

            ${salesOrder.notes ? `
              <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
                <h4>📝 Order Notes</h4>
                <p>${salesOrder.notes}</p>
              </div>
            ` : ''}

            <div style="margin-top: 30px; padding: 20px; background-color: #e8f5e8; border-radius: 8px; text-align: center;">
              <h3 style="color: #27ae60; margin-top: 0;">🚀 What's Next?</h3>
              <p>We'll process your order and notify you when it's ready for delivery/pickup.</p>
              <p><strong>Payment Method:</strong> ${salesOrder.payment_method}</p>
              <p><strong>Payment Status:</strong> ${salesOrder.payment_status}</p>
            </div>
          </div>

          <div class="footer">
            <p><strong>${process.env.COMPANY_NAME || 'Smart Inventory Management'}</strong></p>
            <p>For questions about your order, contact us at ${process.env.ADMIN_EMAIL || 'sales@company.com'}</p>
            <p>Order tracking and updates will be sent to this email address</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  // Generate sales order status update email
  generateSalesOrderStatusUpdateEmail(salesOrder, oldStatus, newStatus) {
    const statusMessages = {
      CONFIRMED: {
        title: '✅ Order Confirmed',
        message: 'Your order has been confirmed and is being prepared.',
        color: '#f39c12'
      },
      PROCESSING: {
        title: '🔄 Order Processing',
        message: 'Your order is currently being processed and prepared for delivery.',
        color: '#3498db'
      },
      COMPLETED: {
        title: '📦 Order Completed',
        message: 'Your order has been completed and is ready for delivery/pickup!',
        color: '#27ae60'
      },
      CANCELLED: {
        title: '❌ Order Cancelled',
        message: 'Your order has been cancelled. If you have any questions, please contact us.',
        color: '#e74c3c'
      }
    };

    const statusInfo = statusMessages[newStatus] || {
      title: 'Order Status Updated',
      message: `Your order status has been updated to ${newStatus}.`,
      color: '#666'
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f4f6f9;
          }
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          .header {
            background: ${statusInfo.color};
            color: white;
            padding: 30px;
            text-align: center;
          }
          .content {
            padding: 30px;
          }
          .status-update {
            background-color: #f8f9ff;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid ${statusInfo.color};
            margin-bottom: 25px;
          }
          .order-details {
            background-color: #f8f9fa;
            padding: 15px 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .footer {
            background-color: #2c3e50;
            color: white;
            padding: 20px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>${statusInfo.title}</h1>
            <p>Order Status Update</p>
          </div>

          <div class="content">
            <div class="status-update">
              <h3>📱 Status Change Notification</h3>
              <p>${statusInfo.message}</p>
              <p><strong>Previous Status:</strong> ${oldStatus}</p>
              <p><strong>New Status:</strong> ${newStatus}</p>
            </div>

            <div class="order-details">
              <h3>📋 Order Information</h3>
              <p><strong>Order Number:</strong> ${salesOrder.order_number}</p>
              <p><strong>Customer:</strong> ${salesOrder.customer_info.name}</p>
              <p><strong>Order Date:</strong> ${new Date(salesOrder.order_date).toLocaleDateString()}</p>
              <p><strong>Total Amount:</strong> $${salesOrder.total_amount.toFixed(2)}</p>
              <p><strong>Payment Status:</strong> ${salesOrder.payment_status}</p>
            </div>

            ${newStatus === 'COMPLETED' ? `
              <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; text-align: center;">
                <h3 style="color: #27ae60; margin-top: 0;">🎉 Thank You!</h3>
                <p>Your order is complete. Thank you for your business!</p>
                <p>We hope you're satisfied with your purchase.</p>
              </div>
            ` : ''}

            ${newStatus === 'CANCELLED' ? `
              <div style="background-color: #fdf2f2; padding: 20px; border-radius: 8px;">
                <h3 style="color: #e74c3c; margin-top: 0;">Refund Information</h3>
                <p>If you have already paid for this order, a refund will be processed within 3-5 business days.</p>
                <p>For questions about refunds, please contact our support team.</p>
              </div>
            ` : ''}
          </div>

          <div class="footer">
            <p><strong>${process.env.COMPANY_NAME || 'Smart Inventory Management'}</strong></p>
            <p>Contact us: ${process.env.ADMIN_EMAIL || 'sales@company.com'}</p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  // Generate low stock alert for admin when customer orders nearly out-of-stock items
  generateOrderLowStockAlert(salesOrder, lowStockItems) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f6f9; }
          .email-container { max-width: 700px; margin: 0 auto; background-color: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .header { background: #e74c3c; color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .alert-item { background: #fff5f5; border: 1px solid #fed7d7; border-radius: 8px; padding: 15px; margin: 10px 0; }
          .order-info { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <h1>🚨 Low Stock Alert</h1>
            <p>Customer order triggered inventory warning</p>
          </div>
          <div class="content">
            <div class="order-info">
              <h3>📋 Related Order</h3>
              <p><strong>Order:</strong> ${salesOrder.order_number}</p>
              <p><strong>Customer:</strong> ${salesOrder.customer_info.name}</p>
              <p><strong>Date:</strong> ${new Date(salesOrder.order_date).toLocaleDateString()}</p>
            </div>
            <h3>⚠️ Low Stock Items</h3>
            ${lowStockItems.map(item => `
              <div class="alert-item">
                <h4>${item.product_name}</h4>
                <p><strong>Ordered Quantity:</strong> ${item.ordered_quantity}</p>
                <p><strong>Remaining Stock:</strong> ${item.remaining_stock}</p>
                <p><strong>Reorder Point:</strong> ${item.reorder_point}</p>
                ${item.remaining_stock <= item.reorder_point ? '<p style="color: #e74c3c;"><strong>⚠️ CRITICAL: Below reorder point!</strong></p>' : ''}
              </div>
            `).join('')}
            <div style="margin-top: 30px; padding: 20px; background-color: #fff8f0; border-radius: 8px;">
              <h3>🔄 Recommended Actions</h3>
              <ul>
                <li>Review inventory levels for these products</li>
                <li>Create purchase orders for critical items</li>
                <li>Consider increasing reorder points if needed</li>
                <li>Monitor upcoming sales to prevent stockouts</li>
              </ul>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }
}

module.exports = new EmailService()