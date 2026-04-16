import Sidebar from "./Sidebar"
import Topbar from "./Topbar"

function Layout({ children }) {
  return (
    <div className="layout">
      <Sidebar />

      <div className="main-layout">
        <Topbar />
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  )
}

export default Layout