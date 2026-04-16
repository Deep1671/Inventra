const Product = require("../models/product")
const { LowStockAlert } = require("../models/inventory")
const emailService = require("./emailService")

// ====================================
// EMAIL AUTOMATION FUNCTIONS
// ====================================

// Send low stock alert emails to admin
const sendLowStockAlertEmails = async () => {
  try {
    if (process.env.SEND_EMAILS !== 'true' || !process.env.ADMIN_EMAIL) {
      console.log("📧 Email sending disabled or admin email not configured");
      return;
    }

    console.log("📧 Checking for low stock products to send alerts...");
    
    // Get products with low stock
    const lowStockProducts = await Product.find({
      $expr: { $lte: ["$current_stock", "$reorder_point"] }
    }).select('name current_stock reorder_point');

    if (lowStockProducts.length === 0) {
      console.log("✅ No low stock products found - no email needed");
      return;
    }

    console.log(`🚨 Found ${lowStockProducts.length} products with low stock`);

    // Prepare alert data for email
    const alertData = lowStockProducts.map(product => ({
      product_name: product.name,
      current_stock: product.current_stock,
      reorder_point: product.reorder_point
    }));

    // Send email to admin
    const emailContent = emailService.generateLowStockAlertEmail(alertData);
    await emailService.sendEmail(
      process.env.ADMIN_EMAIL,
      `🚨 URGENT: Low Stock Alert - ${lowStockProducts.length} Items Require Attention`,
      emailContent
    );

    console.log(`✅ Low stock alert email sent to admin (${lowStockProducts.length} items)`);
  } catch (error) {
    console.error("❌ Error sending low stock alert emails:", error);
  }
};

// Check and send low stock emails (can be called by cron job or manually)
const checkAndSendLowStockAlerts = async (req, res) => {
  try {
    await sendLowStockAlertEmails();
    
    if (res) {
      res.status(200).json({
        success: true,
        message: "Low stock alert check completed"
      });
    }
  } catch (error) {
    console.error("❌ Error in low stock alert check:", error);
    
    if (res) {
      res.status(500).json({
        success: false,
        message: "Error checking low stock alerts",
        error: error.message
      });
    }
  }
};

// Initialize automated low stock alerts on server start
const initializeEmailAutomation = () => {
  console.log("🔄 Initializing email automation system...");
  
  if (process.env.SEND_EMAILS === 'true') {
    // Check for low stock every 6 hours (21600000 ms)
    setInterval(sendLowStockAlertEmails, 21600000);
    console.log("✅ Low stock email alerts scheduled every 6 hours");
  } else {
    console.log("📧 Email automation disabled in environment");
  }
};

module.exports = {
  sendLowStockAlertEmails,
  checkAndSendLowStockAlerts,
  initializeEmailAutomation
}