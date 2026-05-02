import { Suspense } from "react"
import Sidebar from "../components/Sidebar"
import Topbar from "../components/Topbar"
import ChatBot from "../components/ChatBot"
import { Outlet, useLocation } from "react-router-dom"
import "../styles/dashboardLayout.css"

function DashboardLayout() {
  const location = useLocation()

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-container">
        <Topbar />

        <main className="dashboard-main">
          <Suspense
            fallback={
              <div className="page-loader">
                <div className="spinner"></div>
                <p>Loading...</p>
              </div>
            }
          >
            <div key={location.pathname} className="page-transition">
              <Outlet />
            </div>
          </Suspense>
        </main>
      </div>

      <ChatBot style={{ pointerEvents: 'auto' }} />
    </div>
  )
}

export default DashboardLayout  
