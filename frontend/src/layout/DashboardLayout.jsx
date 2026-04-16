import Sidebar from "../components/Sidebar"
import { Outlet } from "react-router-dom"
import "../styles/dashboardLayout.css"

function DashboardLayout(){

return(

<div className="dashboard-layout">

<Sidebar />

<div className="dashboard-main">
<Outlet />
</div>

</div>

)

}

export default DashboardLayout