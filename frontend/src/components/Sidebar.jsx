import { NavLink } from "react-router-dom"
import { useState, useEffect } from "react"
import "../styles/sidebar.css"
import logo from "../assets/InventraLogo.png"

function Sidebar(){
  const [user, setUser] = useState(() => {
    const rawUser = localStorage.getItem("user")
    return rawUser ? JSON.parse(rawUser) : null
  })

  const isAdmin = user?.role === "admin"

return(

<div className="sidebar">

<div className="sidebar-logo">
<img src={logo} alt="Inventra"/>
</div>

<nav className="sidebar-menu">

<NavLink to="/dashboard">📊 Dashboard</NavLink>
<NavLink to="/products">📦 Products</NavLink>
<NavLink to="/suppliers">🤝 Suppliers</NavLink>
<NavLink to="/purchase-orders">📋 Purchase Orders</NavLink>
<NavLink to="/payments">💳 Payments</NavLink>
<NavLink to="/sales">💰 Sales</NavLink>
<NavLink to="/inventory">📚 Inventory</NavLink>
{isAdmin && <NavLink to="/analytics">📈 Analytics</NavLink>}
{isAdmin && <NavLink to="/advanced-analytics">📊 Advanced Analytics</NavLink>}
{isAdmin && <NavLink to="/insights">🤖 AI Insights</NavLink>}
{isAdmin && <NavLink to="/users">👥 Users</NavLink>}

</nav>

</div>

)

}

export default Sidebar