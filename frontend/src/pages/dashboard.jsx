import { useEffect, useState } from "react"
import api from "../services/apiClient"
import { useNavigate } from "react-router-dom"
import { useApiData } from "../hooks/useCache"
import "../styles/dashboard.css"

function Dashboard() {

const navigate = useNavigate()

// ✅ FIX: make user reactive
const [user, setUser] = useState(() => {
  const rawUser = localStorage.getItem("user")
  return rawUser ? JSON.parse(rawUser) : null
})

// Replace useState + useEffect with useApiData
const { data, loading, error, refetch } = useApiData('/analytics/overview', {
  defaultValue: {
    today_revenue: 0,
    revenue_change_percentage: 0,
    top_product: null,
    low_stock_alerts: [],
    recent_sales: []
  },
  onSuccess: (data) => {
    console.log("✅ Dashboard data loaded successfully:", data);
    console.log("📊 Low stock alerts count:", data?.low_stock_alerts?.length || 0);
    console.log("💰 Revenue:", data?.today_revenue || 0);
  },
  onError: (err) => {
    console.error("❌ Error fetching dashboard:", err);
    console.error("Error message:", err?.message);
    console.error("Full error:", err);
    if(err?.response?.status === 401 || err?.response?.status === 403){
      // Logout handled by Topbar
    }
  }
})

const dashboardData = data || {
  today_revenue: 0,
  revenue_change_percentage: 0,
  top_product: null,
  low_stock_alerts: [],
  recent_sales: []
}

useEffect(()=>{
  // ✅ FIX: now reacts properly when user becomes null
  if(!user || !["admin","manager"].includes(user.role)){
    navigate("/")
    return
  }
},[navigate,user]) // depends on user now

// Listen for inventory updates from other components (like PO delivery)
useEffect(() => {
  const handleInventoryUpdate = (event) => {
    console.log("📊 Dashboard - Inventory updated event received:", event.detail);
    console.log("📊 Refreshing dashboard data due to external update...");
    refetch(); // Use the hook's refetch instead of manual function
  };

  window.addEventListener('inventoryUpdated', handleInventoryUpdate);

  return () => {
    window.removeEventListener('inventoryUpdated', handleInventoryUpdate);
  };
}, [refetch]);


return(

<div className="dashboard-container">

<div className="dashboard-header">
<h1 className="dashboard-title">
📊<span className="gradient-text">Dashboard Overview</span>
</h1>
</div>

<div className="welcome-section">
<h2>Welcome back, {user?.name} 👋</h2>
<p>Here's what's happening with your inventory today.</p>
</div>

{loading && !data && <div className="loading">Loading dashboard data...</div>}
{error && <div className="error-message">Error loading dashboard: {error}</div>}

{/* Show dashboard cards if data exists, regardless of loading state */}
{(data || dashboardData.today_revenue > 0) && (
<>
<div className="kpi-container">

<div className="kpi-card">
<h3>Today's Revenue</h3>
<p>₹ {dashboardData.today_revenue}</p>
</div>

<div className="kpi-card">
<h3>Low Stock Alerts</h3>
<p>{dashboardData.low_stock_alerts.length}</p>
</div>

<div className="kpi-card">
<h3>Top Selling Product</h3>
<p>{dashboardData.top_product?.name || "No data"}</p>
</div>

</div>

<div className="recent-sales">

<h2>Recent Sales</h2>

{dashboardData.recent_sales?.length > 0 ? (

<table className="sales-table">

<thead>
<tr>
<th>Product</th>
<th>Quantity</th>
<th>Revenue</th>
</tr>
</thead>

<tbody>
{dashboardData.recent_sales.map((sale)=>(
<tr key={sale._id}>
<td>{sale.product_name}</td>
<td>{sale.quantity_sold}</td>
<td>₹ {sale.revenue}</td>
</tr>
))}
</tbody>

</table>

) : (
<p>No recent sales</p>
)}

</div>
</>
)}

</div>

)

}

export default Dashboard