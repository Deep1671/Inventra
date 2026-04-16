require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/user");

async function createTestUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("🔗 MongoDB Connected");

    // Check if admin exists
    const existingAdmin = await User.findOne({ email: "admin@test.com" });
    
    if (existingAdmin) {
      console.log("✅ Admin user already exists");
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Role: ${existingAdmin.role}`);
    } else {
      // Hash password
      const hashedPassword = await bcrypt.hash("Admin@123456", 10);

      // Create admin user
      const admin = new User({
        name: "Admin User",
        email: "admin@test.com",
        password: hashedPassword,
        role: "admin",
        phone: "9876543210",
      });

      await admin.save();
      console.log("✅ Admin user created");
      console.log(`   Email: admin@test.com`);
      console.log(`   Password: Admin@123456`);
      console.log(`   Role: admin`);
    }

    // Create manager user
    const existingManager = await User.findOne({ email: "manager@test.com" });
    
    if (existingManager) {
      console.log("\n✅ Manager user already exists");
      console.log(`   Email: ${existingManager.email}`);
      console.log(`   Role: ${existingManager.role}`);
    } else {
      const hashedPassword = await bcrypt.hash("Manager@123456", 10);

      const manager = new User({
        name: "Manager User",
        email: "manager@test.com",
        password: hashedPassword,
        role: "manager",
        phone: "8765432109",
      });

      await manager.save();
      console.log("\n✅ Manager user created");
      console.log(`   Email: manager@test.com`);
      console.log(`   Password: Manager@123456`);
      console.log(`   Role: manager`);
    }

    console.log("\n📝 You can now login with these credentials");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

createTestUser();
