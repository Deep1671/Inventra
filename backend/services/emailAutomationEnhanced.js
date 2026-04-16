const Product = require("../models/product")
const PurchaseOrder = require("../models/purchaseOrder")
const Supplier = require("../models/supplier")
const { LowStockAlert } = require("../models/inventory")
const emailService = require("./emailService")

// ====================================
// DAILY EMAIL AUTOMATION FUNCTIONS
// ====================================

// Send consolidated daily emails to suppliers
// NOTE: DISABLED - Emails are now only sent when status is explicitly changed to ORDERED
const sendDailySupplierEmails = async () => {
  try {
    console.log("ℹ️  Daily supplier email automation is disabled. Emails are sent when PO status is manually changed to ORDERED.");
    return;
  } catch (error) {
    console.error("❌ Error in daily supplier email process:", error);
  }
};

// Auto-create POs for low stock items and prepare for next day email
const autoCreatePOsForLowStock = async () => {
  try {
    console.log("🤖 Auto-creating POs for low stock items...");
    
    // Get products with low stock that have preferred suppliers
    const lowStockProducts = await Product.find({
      $expr: { $lte: ["$current_stock", "$reorder_point"] },
      preferred_supplier_id: { $exists: true, $ne: null }
    }).populate('preferred_supplier_id');

    if (lowStockProducts.length === 0) {
      console.log("✅ No low stock products with suppliers found");
      return;
    }

    console.log(`🔄 Creating POs for ${lowStockProducts.length} low stock products`);

    for (const product of lowStockProducts) {
      // Check if PO already exists for this product (avoid duplicates)
      const existingPO = await PurchaseOrder.findOne({
        'items.product_id': product._id,
        status: { $in: ['PENDING', 'ORDERED'] },
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      });

      if (existingPO) {
        console.log(`⏭️  PO already exists for ${product.name}, skipping`);
        continue;
      }

      // Generate order number manually for auto-created POs
      const count = await PurchaseOrder.countDocuments();
      const date = new Date().getFullYear().toString().slice(-2);
      const orderNumber = `PO-${date}-${(count + 1).toString().padStart(5, "0")}`;

      // Create PO
      const unitPrice = product.cost_price || 0;
      const orderQuantity = product.reorder_quantity || Math.max(product.reorder_point * 2, 50);
      const itemTotal = orderQuantity * unitPrice;

      const po = new PurchaseOrder({
        order_number: orderNumber, // Explicitly set order number
        supplier_id: product.preferred_supplier_id._id,
        supplier_name: product.preferred_supplier_id.name,
        items: [{
          product_id: product._id,
          product_name: product.name,
          quantity: orderQuantity,
          unit_price: unitPrice,
          total: itemTotal
        }],
        total_amount: itemTotal,
        status: "PENDING", // Will be sent in daily email
        created_by: "AUTO_SYSTEM",
        is_auto_generated: true
      });

      await po.save();
      console.log(`✅ Auto-created PO for ${product.name} (Qty: ${orderQuantity})`);
    }

    console.log(`🎉 Auto-PO creation completed for ${lowStockProducts.length} products`);
  } catch (error) {
    console.error("❌ Error auto-creating POs:", error);
  }
};

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

// Check and send low stock emails (manual trigger)
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

// Manual trigger for daily supplier emails
const triggerDailySupplierEmails = async (req, res) => {
  try {
    await sendDailySupplierEmails();
    
    if (res) {
      res.status(200).json({
        success: true,
        message: "Daily supplier emails sent successfully"
      });
    }
  } catch (error) {
    console.error("❌ Error in daily supplier emails:", error);
    
    if (res) {
      res.status(500).json({
        success: false,
        message: "Error sending daily supplier emails",
        error: error.message
      });
    }
  }
};

// Send reminders to admin for orders not delivered after 2 days
const sendDeliveryReminders = async () => {
  try {
    if (process.env.SEND_EMAILS !== 'true' || !process.env.ADMIN_EMAIL) {
      console.log("📧 Email sending disabled or admin email not configured");
      return;
    }

    console.log("📬 Checking for undelivered orders to send reminders...");
    
    const SalesOrder = require("../models/salesOrder");
    const PurchaseOrder = require("../models/purchaseOrder");
    const Supplier = require("../models/supplier");
    
    // Date 2 days ago
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Find undelivered Purchase Orders created 2+ days ago
    const pendingPOs = await PurchaseOrder.find({
      status: { $in: ["PENDING", "ORDERED"] },
      createdAt: { $lte: twoDaysAgo }
    }).populate("supplier_id").populate("items.product_id");

    // Find incomplete Sales Orders created 2+ days ago
    const incompleteSOs = await SalesOrder.find({
      status: { $in: ["DRAFT", "CONFIRMED", "PROCESSING"] },
      order_date: { $lte: twoDaysAgo }
    });

    if (pendingPOs.length === 0 && incompleteSOs.length === 0) {
      console.log("✅ No pending orders requiring reminders");
      return;
    }

    console.log(`📬 Found ${pendingPOs.length} pending POs and ${incompleteSOs.length} incomplete SOs`);

    // Check if reminder was already sent in last 2 days
    const reminderCheckTime = new Date();
    reminderCheckTime.setDate(reminderCheckTime.getDate() - 2);

    const poNeedingReminders = pendingPOs.filter(po => 
      !po.last_reminder_sent || po.last_reminder_sent < reminderCheckTime
    );

    const soNeedingReminders = incompleteSOs.filter(so => 
      !so.last_reminder_sent || so.last_reminder_sent < reminderCheckTime
    );

    if (poNeedingReminders.length === 0 && soNeedingReminders.length === 0) {
      console.log("✅ All pending orders already have recent reminders");
      return;
    }

    console.log(`📬 Sending reminders for ${poNeedingReminders.length} POs and ${soNeedingReminders.length} SOs`);

    // Generate email content
    const emailContent = emailService.generateDeliveryReminderEmail(
      poNeedingReminders,
      soNeedingReminders
    );

    // Send email to admin
    await emailService.sendEmail(
      process.env.ADMIN_EMAIL,
      `⏰ REMINDER: ${poNeedingReminders.length + soNeedingReminders.length} Orders Not Delivered (2+ Days Old)`,
      emailContent
    );

    // Update reminder sent date and count
    const poIds = poNeedingReminders.map(po => po._id);
    const soIds = soNeedingReminders.map(so => so._id);

    if (poIds.length > 0) {
      await PurchaseOrder.updateMany(
        { _id: { $in: poIds } },
        { 
          last_reminder_sent: new Date(),
          $inc: { reminder_count: 1 }
        }
      );
    }

    if (soIds.length > 0) {
      await SalesOrder.updateMany(
        { _id: { $in: soIds } },
        { 
          last_reminder_sent: new Date(),
          $inc: { reminder_count: 1 }
        }
      );
    }

    console.log(`✅ Delivery reminder email sent to admin`);
  } catch (error) {
    console.error("❌ Error sending delivery reminders:", error);
  }
};

// Initialize automated email system
const initializeEmailAutomation = () => {
  console.log("🔄 Initializing enhanced email automation system...");
  
  if (process.env.SEND_EMAILS === 'true') {
    // Auto-create POs for low stock every day at 10:45 AM
    const now = new Date();
    const todayAt1045AM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 45, 0);
    
    // If it's past 10:45 AM today, schedule for tomorrow
    if (now > todayAt1045AM) {
      todayAt1045AM.setDate(todayAt1045AM.getDate() + 1);
    }
    
    const timeUntil1045AM = todayAt1045AM.getTime() - now.getTime();
    
    setTimeout(() => {
      autoCreatePOsForLowStock();
      setInterval(autoCreatePOsForLowStock, 24 * 60 * 60 * 1000);
    }, timeUntil1045AM > 0 ? timeUntil1045AM : 24 * 60 * 60 * 1000);
    
    // Low stock alerts every 6 hours
    setInterval(sendLowStockAlertEmails, 6 * 60 * 60 * 1000);

    // Delivery reminders every 2 days
    // Run immediately and then every 48 hours
    sendDeliveryReminders();
    setInterval(sendDeliveryReminders, 2 * 24 * 60 * 60 * 1000);
    
    console.log(`✅ Email automation scheduled:`);
    console.log(`   ℹ️  Daily supplier emails: DISABLED (sent only when PO status changed to ORDERED)`);
    console.log(`   🤖 Auto-create POs: Every day at 10:45 AM`);
    console.log(`   🚨 Low stock alerts: Every 6 hours`);
    console.log(`   📬 Delivery reminders: Every 2 days`);
  } else {
    console.log("📧 Email automation disabled in environment");
  }
};

module.exports = {
  sendDailySupplierEmails,
  autoCreatePOsForLowStock,
  sendLowStockAlertEmails,
  checkAndSendLowStockAlerts,
  triggerDailySupplierEmails,
  sendDeliveryReminders,
  initializeEmailAutomation
}