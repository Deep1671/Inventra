import React, { useState } from 'react';
import api from '../services/apiClient';
import '../styles/emailSettings.css';

const EmailSettings = () => {
  const [loading, setLoading] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const triggerLowStockEmail = async () => {
    try {
      setLoading(true);
      setMessage('');
      
      console.log('🔄 Triggering low stock alert email...');
      const response = await api.post('/inventory/alerts/send-email');
      
      console.log('📧 Email trigger response:', response.data);
      setMessage('Low stock alert email sent successfully!');
      setMessageType('success');
    } catch (error) {
      console.error('❌ Error triggering email:', error);
      setMessage(error.response?.data?.message || 'Failed to send email');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const triggerDailySupplierEmails = async () => {
    try {
      setDailyLoading(true);
      setMessage('');
      
      console.log('🔄 Triggering daily supplier emails...');
      const response = await api.post('/inventory/suppliers/send-daily-emails');
      
      console.log('📧 Daily email trigger response:', response.data);
      setMessage('Daily supplier emails sent successfully!');
      setMessageType('success');
    } catch (error) {
      console.error('❌ Error triggering daily emails:', error);
      setMessage(error.response?.data?.message || 'Failed to send daily emails');
      setMessageType('error');
    } finally {
      setDailyLoading(false);
    }
  };

  const triggerAutoPoCreation = async () => {
    try {
      setLoading(true);
      setMessage('');
      
      console.log('🔄 Triggering auto PO creation...');
      const response = await api.post('/inventory/auto-create-pos');
      
      console.log('🤖 Auto PO creation response:', response.data);
      setMessage('Auto PO creation completed successfully!');
      setMessageType('success');
    } catch (error) {
      console.error('❌ Error triggering auto PO creation:', error);
      setMessage(error.response?.data?.message || 'Failed to create auto POs');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="email-settings">
      <div className="email-header">
        <h2>📧 Email Automation Settings</h2>
        <p>Manage automated email notifications for your inventory system</p>
      </div>

      <div className="email-content">
        <div className="email-section">
          <h3>🚨 Low Stock Alerts</h3>
          <div className="email-info">
            <p><strong>Current Status:</strong> {import.meta.env.VITE_SEND_EMAILS === 'true' ? '✅ Enabled' : '❌ Disabled'}</p>
            <p><strong>Schedule:</strong> Every 6 hours</p>
            <p><strong>Recipients:</strong> Admin users</p>
          </div>
          
          <div className="email-actions">
            <button 
              onClick={triggerLowStockEmail}
              disabled={loading}
              className="btn-email-trigger"
            >
              {loading ? '⏳ Sending...' : '📤 Send Test Alert'}
            </button>
            <button 
              onClick={triggerAutoPoCreation}
              disabled={loading}
              className="btn-email-trigger auto-po"
            >
              {loading ? '⏳ Creating...' : '🤖 Test Auto PO Creation'}
            </button>
          </div>
        </div>

        <div className="email-section">
          <h3>🛒 Sales Order Notifications</h3>
          <div className="email-info">
            <p><strong>Customer Confirmations:</strong> ✅ Enabled</p>
            <p><strong>Status Updates:</strong> ✅ Enabled</p>
            <p><strong>Order Completion:</strong> ✅ Enabled</p>
            <p><strong>Low Stock Alerts:</strong> ✅ Enabled (triggered by orders)</p>
            <p><strong>Admin New Order Alerts:</strong> ✅ Enabled</p>
          </div>
        </div>

        <div className="email-section">
          <h3>📋 Purchase Order Emails</h3>
          <div className="email-info">
            <p><strong>Auto-send to suppliers:</strong> ✅ Enabled</p>
            <p><strong>Status updates:</strong> ✅ Enabled</p>
            <p><strong>Admin notifications:</strong> ✅ Enabled</p>
            <p><strong>Daily Consolidation:</strong> ✅ Every day at 11:00 AM</p>
          </div>
          
          <div className="email-actions">
            <button 
              onClick={triggerDailySupplierEmails}
              disabled={dailyLoading}
              className="btn-email-trigger daily"
            >
              {dailyLoading ? '⏳ Sending...' : '📧 Send Daily Supplier Emails'}
            </button>
          </div>
        </div>

        <div className="email-section">
          <h3>⚙️ Configuration</h3>
          <div className="config-grid">
            <div className="config-item">
              <label>SMTP Host:</label>
              <span>smtp.gmail.com</span>
            </div>
            <div className="config-item">
              <label>Company Name:</label>
              <span>Smart Inventory Management</span>
            </div>
            <div className="config-item">
              <label>Admin Email:</label>
              <span>{import.meta.env.VITE_ADMIN_EMAIL || 'Not configured'}</span>
            </div>
          </div>
        </div>

        {message && (
          <div className={`email-message ${messageType}`}>
            <p>{message}</p>
          </div>
        )}

        <div className="email-features">
          <h3>✨ Available Email Features</h3>
          <div className="features-grid">
            <div className="feature-card">
              <h4>🔔 Low Stock Notifications</h4>
              <p>Automatic alerts when products fall below reorder point</p>
            </div>
            <div className="feature-card">
              <h4>🛒 Sales Order Notifications</h4>
              <p>Automated emails for customer orders and admin alerts</p>
            </div>
            <div className="feature-card">
              <h4>📧 Daily Supplier Emails</h4>
              <p>Consolidated daily emails to suppliers with all pending orders</p>
            </div>
            <div className="feature-card">
              <h4>📄 Purchase Order Emails</h4>
              <p>Professional PO emails sent directly to suppliers</p>
            </div>
            <div className="feature-card">
              <h4>📈 Status Updates</h4>
              <p>Email notifications for PO status changes</p>
            </div>
            <div className="feature-card">
              <h4>🎨 Beautiful Templates</h4>
              <p>Professional HTML email templates with company branding</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailSettings;
