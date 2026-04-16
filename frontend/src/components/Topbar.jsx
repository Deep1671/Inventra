import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import "../styles/topbar.css"

function Topbar() {
  const navigate = useNavigate()
  const menuRef = useRef(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const token = localStorage.getItem("token")
  const rawUser = localStorage.getItem("user")
  const user = rawUser ? JSON.parse(rawUser) : {}

  useEffect(() => {
    // Handle click outside dropdown
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showUserMenu])

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "manager",
  })

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    navigate("/")
  }

  const handleCreateUserChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleCreateUserSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setIsLoading(true)

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      await axios.post(
        "http://localhost:5000/api/auth/register",
        {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      setSuccess("User created successfully!")
      setFormData({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "manager",
      })

      setTimeout(() => {
        setShowCreateUserModal(false)
        setSuccess("")
      }, 2000)
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create user. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-content">
          {/* Left - Title/Breadcrumb */}
          <div className="topbar-left">
            <h2 className="topbar-title">Dashboard</h2>
          </div>

          {/* Right - User Actions */}
          <div className="topbar-right">
            {/* Create User Button - Only for Admin */}
            {user?.role === "admin" && (
              <button
                className="topbar-btn create-user-btn"
                onClick={() => setShowCreateUserModal(true)}
                title="Create a new user account"
              >
                <span className="btn-icon">➕</span>
                <span className="btn-text">Create User</span>
              </button>
            )}

            {/* User Profile Dropdown */}
            <div className="topbar-user-menu">
              <button
                className="topbar-user-btn"
                onClick={() => {
                  console.log("User button clicked! Current showUserMenu:", showUserMenu)
                  setShowUserMenu(!showUserMenu)
                }}
                title="User menu"
              >
                <span className="user-avatar">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                </span>
                <span className="user-name">{user?.name || "User"}</span>
                <span className={`menu-arrow ${showUserMenu ? "open" : ""}`}>▼</span>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="topbar-dropdown" style={{display: 'block', visibility: 'visible', position: 'absolute', top: '100%', right: '0'}}>
                  <div className="dropdown-header">
                    <div className="user-info">
                      <strong>{user?.name}</strong>
                      <small>{user?.email}</small>
                      <span className="user-role">{user?.role}</span>
                    </div>
                  </div>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                    👤 Profile
                  </button>
                  <button className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                    ⚙️ Settings
                  </button>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item logout-item" onClick={handleLogout}>
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="modal-overlay" onClick={() => !isLoading && setShowCreateUserModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New User</h3>
              <button
                className="modal-close"
                onClick={() => setShowCreateUserModal(false)}
                disabled={isLoading}
              >
                ✕
              </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleCreateUserSubmit} className="create-user-form">
              <div className="form-group">
                <label htmlFor="name">Full Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleCreateUserChange}
                  placeholder="Enter full name"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleCreateUserChange}
                  placeholder="Enter email address"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password *</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleCreateUserChange}
                  placeholder="Enter password"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password *</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleCreateUserChange}
                  placeholder="Confirm password"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">Role *</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleCreateUserChange}
                  disabled={isLoading}
                >
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateUserModal(false)}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default Topbar
