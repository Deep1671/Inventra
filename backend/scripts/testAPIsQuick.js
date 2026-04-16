const axios = require("axios");

async function testAPIs() {
  try {
    console.log("🧪 Testing API Endpoints...\n");

    // First, login to get token
    console.log("🔐 Authenticating...");
    const loginRes = await axios.post("http://localhost:5000/api/auth/login", {
      email: "admin@test.com",
      password: "Admin@123456",
    });

    const token = loginRes.data.token;
    console.log("✅ Authenticated\n");

    const endpoints = [
      "/purchase-orders",
      "/payments",
      "/sales-orders",
      "/suppliers",
      "/products",
    ];

    for (const endpoint of endpoints) {
      try {
        const res = await axios.get(`http://localhost:5000/api${endpoint}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 5000,
        });

        const data = res.data;
        const count = Array.isArray(data) 
          ? data.length 
          : (data?.data?.length || Object.keys(data).length);

        console.log(`✅ ${endpoint}`);
        console.log(`   Status: ${res.status}`);
        console.log(`   Data Count: ${count}`);
        console.log(`   Response Type: ${typeof data}`);
        
        if (Array.isArray(data) && data.length > 0) {
          console.log(`   Sample Item Keys: ${Object.keys(data[0]).join(", ").substring(0, 100)}`);
        } else if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
          console.log(`   Sample Item Keys: ${Object.keys(data.data[0]).join(", ").substring(0, 100)}`);
        }
        console.log();
      } catch (err) {
        console.log(`❌ ${endpoint}`);
        console.log(`   Error: ${err.message}`);
        if (err.response) {
          console.log(`   Status: ${err.response.status}`);
          console.log(`   Response: ${JSON.stringify(err.response.data).substring(0, 200)}`);
        }
        console.log();
      }
    }
  } catch (error) {
    console.error("❌ Test error:", error.message);
  }
}

testAPIs();
