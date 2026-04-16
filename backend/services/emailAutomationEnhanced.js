const Product = require("../models/product")
const PurchaseOrder = require("../models/purchaseOrder")
const Supplier = require("../models/supplier")
const { LowStockAlert } = require("../models/inventory")
const emailService = require("./emailService")

// ====================================
// DAILY EMAIL AUTOMATION FUNCTIONS
// ====================================

// Send consolidated daily emails to suppliers
const sendDailySupplierEmails = async () => {
  try {
    if (process.env.SEND_EMAILS !== 'true') {
      console.log("📧 Email sending disabled");
      return;
    }

    console.log("📧 Starting daily supplier email process...");
    
    // Get all PENDING POs created in last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const pendingPOs = await PurchaseOrder.find({
      status: "PENDING",
      createdAt: { $gte: yesterday }
    }).populate("supplier_id").populate("items.product_id");

    if (pendingPOs.length === 0) {
      console.log("✅ No pending orders found for daily email");
      return;
    }

    // Group POs by supplier
    const supplierGroups = {};
    pendingPOs.forEach(po => {
      const supplierId = po.supplier_id._id.toString();
      if (!supplierGroups[supplierId]) {
        supplierGroups[supplierId] = {
          supplier: po.supplier_id,
          orders: [],
          totalItems: 0,
          totalAmount: 0
        };
      }
      supplierGroups[supplierId].orders.push(po);
      supplierGroups[supplierId].totalItems += po.items.length;
      supplierGroups[supplierId].totalAmount += po.total_amount;
    });

    console.log(`📊 Found orders for ${Object.keys(supplierGroups).length} suppliers`);

    // Send consolidated email to each supplier
    for (const [supplierId, group] of Object.entries(supplierGroups)) {
      if (group.supplier.email) {
        try {
          console.log(`📧 Sending daily email to ${group.supplier.name} (${group.orders.length} orders)`);
          
          const emailContent = emailService.generateDailySupplierEmail(group.supplier, group.orders);
          await emailService.sendEmail(
            group.supplier.email,
            `📋 Daily Order Summary - ${group.orders.length} Purchase Orders`,
            emailContent
          );

          // Update PO status to ORDERED (email sent)
          const poIds = group.orders.map(po => po._id);
          await PurchaseOrder.updateMany(
            { _id: { $in: poIds } },
            { 
              status: "ORDERED",
              order_sent_date: new Date()
            }
          );

          console.log(`✅ Email sent to ${group.supplier.name}, ${group.orders.length} POs marked as ORDERED`);
        } catch (emailError) {
          console.error(`❌ Failed to send email to ${group.supplier.name}:`, emailError.message);
        }
      } else {
        console.log(`⚠️  No email for supplier: ${group.supplier.name}`);
      }
    }

    console.log(`✅ Daily supplier email process completed`);
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

// Initialize automated email system
const initializeEmailAutomation = () => {
  console.log("🔄 Initializing enhanced email automation system...");
  
  if (process.env.SEND_EMAILS === 'true') {
    // Daily supplier emails at 11:00 AM (every 24 hours)
    const now = new Date();
    const todayAt11AM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12,0,0);
    
    // If it's past 11:00 AM today, schedule for tomorrow
    if (now > todayAt11AM) {
      todayAt11AM.setDate(todayAt11AM.getDate() + 1);
    }
    
    const timeUntil11AM = todayAt11AM.getTime() - now.getTime();
    
    // Schedule first run
    setTimeout(() => {
      sendDailySupplierEmails();
      // Then repeat every 24 hours
      setInterval(sendDailySupplierEmails, 24 * 60 * 60 * 1000);
    }, timeUntil11AM);
    
    // Auto-create POs for low stock every day at 10:45 AM (15 minutes before emails)
    const autoCreateTime = new Date(todayAt11AM.getTime()-15*60*1000); // 10:45 AM
    const timeUntil1045AM = autoCreateTime.getTime() - now.getTime();
    
    setTimeout(() => {
      autoCreatePOsForLowStock();
      setInterval(autoCreatePOsForLowStock, 24 * 60 * 60 * 1000);
    }, timeUntil1045AM > 0 ? timeUntil1045AM : 24 * 60 * 60 * 1000);
    
    // Low stock alerts every 6 hours
    setInterval(sendLowStockAlertEmails, 6 * 60 * 60 * 1000);
    
    console.log(`✅ Email automation scheduled:`);
    console.log(`   📧 Daily supplier emails: Every day at 11:00 AM`);
    console.log(`   🤖 Auto-create POs: Every day at 10:45 AM`);
    console.log(`   🚨 Low stock alerts: Every 6 hours`);
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
  initializeEmailAutomation
}