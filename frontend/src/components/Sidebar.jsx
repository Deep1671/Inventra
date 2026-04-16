import { NavLink } from "react-router-dom"
import "../styles/sidebar.css"
import logo from "../assets/InventraLogo.png"

function Sidebar(){

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
<NavLink to="/analytics">📈 Analytics</NavLink>
<NavLink to="/users">👥 Users</NavLink>

</nav>

</div>

)

}

export default Sidebar