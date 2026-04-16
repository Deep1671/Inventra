import { useEffect, useState } from "react"
import api from "../services/apiClient"
import { useNavigate } from "react-router-dom"
import "../styles/dashboard.css"

function Dashboard() {

const navigate = useNavigate()

// ✅ FIX: make user reactive
const [user, setUser] = useState(() => {
  const rawUser = localStorage.getItem("user")
  return rawUser ? JSON.parse(rawUser) : null
})

const [data,setData] = useState({
  today_revenue:0,
  top_product:null,
  low_stock_alerts:[],
  recent_sales:[]
})

const [showMenu,setShowMenu] = useState(false)
const [showPasswordModal,setShowPasswordModal] = useState(false)

const [currentPassword,setCurrentPassword] = useState("")
const [newPassword,setNewPassword] = useState("")

// ✅ FIX: proper logout
const handleLogout = () => {
  console.log("Logging out...")
  localStorage.clear()
  sessionStorage.clear()
  setUser(null)   // force re-render
  // Force full page reload to login
  window.location.href = "/"
}

const handleChangePassword = async () => {
  try{
    await api.patch("/users/change-password", { currentPassword, newPassword })

    alert("Password updated successfully")

    setShowPasswordModal(false)
    setCurrentPassword("")
    setNewPassword("")

  }catch(err){
    alert("Password update failed")
  }
}

useEffect(()=>{

  // ✅ FIX: now reacts properly when user becomes null
  if(!user || !["admin","manager"].includes(user.role)){
    navigate("/")
    return
  }

  const fetchDashboard = async ()=>{

    try{

      console.log("📊 Fetching dashboard data...");
      
      const res = await api.get("/analytics/overview")

      setData(res.data)
      console.log("📊 Dashboard data updated:", res.data.low_stock_alerts?.length || 0, "low stock alerts");

    }catch(err){

      console.error("Error fetching dashboard:", err)

      if(err.response?.status === 401 || err.response?.status === 403){
        handleLogout()
      }

    }

  }

  fetchDashboard()

},[navigate,user]) // depends on user now

// Listen for inventory updates from other components (like PO delivery)
useEffect(() => {
  const handleInventoryUpdate = (event) => {
    console.log("📊 Dashboard - Inventory updated event received:", event.detail);
    console.log("📊 Refreshing dashboard data due to external update...");
    fetchDashboard();
  };

  window.addEventListener('inventoryUpdated', handleInventoryUpdate);

  return () => {
    window.removeEventListener('inventoryUpdated', handleInventoryUpdate);
  };
}, []);


return(

<div className="dashboard-container">

<div className="dashboard-header">

<h1 className="dashboard-title">
Dashboard Overview
</h1>

<div className="dashboard-actions">

<div className="user-menu">

<div
className="user-name"
onClick={()=>setShowMenu(!showMenu)}
>
👤 {user?.name} ▾
</div>

{showMenu && (

<div className="user-dropdown">

<button onClick={(e) => {
e.preventDefault()
e.stopPropagation()
setShowPasswordModal(true)
setShowMenu(false)
}}>
Change Password
</button>

</div>

)}

</div>


{user?.role === "admin" && (
<button
className="create-user-btn"
onClick={()=>navigate("/register")}
>
Create User
</button>
)}

<button
className="logout-btn"
onClick={(e) => {
e.preventDefault()
e.stopPropagation()
handleLogout()
}}
>
Logout
</button>

</div>

</div>

<div className="welcome-section">
<h2>Welcome back, {user?.name} 👋</h2>
<p>Here's what's happening with your inventory today.</p>
</div>

<div className="kpi-container">

<div className="kpi-card">
<h3>Today's Revenue</h3>
<p>₹ {data.today_revenue}</p>
</div>

<div className="kpi-card">
<h3>Low Stock Alerts</h3>
<p>{data.low_stock_alerts.length}</p>
</div>

<div className="kpi-card">
<h3>Top Selling Product</h3>
<p>{data.top_product?.name || "No data"}</p>
</div>

</div>

<div className="recent-sales">

<h2>Recent Sales</h2>

{data.recent_sales?.length > 0 ? (

<table className="sales-table">

<thead>
<tr>
<th>Product</th>
<th>Quantity</th>
<th>Revenue</th>
</tr>
</thead>

<tbody>
{data.recent_sales.map((sale)=>(
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

{showPasswordModal && (

<div className="modal-overlay">

<div className="modal">

<h3>Change Password</h3>

<input
type="password"
placeholder="Current Password"
value={currentPassword}
onChange={(e)=>setCurrentPassword(e.target.value)}
/>

<input
type="password"
placeholder="New Password"
value={newPassword}
onChange={(e)=>setNewPassword(e.target.value)}
/>

<button onClick={handleChangePassword}>
Update Password
</button>

<button
className="cancel-btn"
onClick={()=>setShowPasswordModal(false)}
>
Cancel
</button>

</div>

</div>

)}

</div>

)

}

export default Dashboard