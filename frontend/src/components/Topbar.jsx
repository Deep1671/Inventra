import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import apiClient from "../services/apiClient"
import "../styles/topbar.css"

const SETTINGS_STORAGE_KEY = "inventra_settings"

const DEFAULT_SETTINGS = {
  theme: "dark",
  language: "en",
  notifications: {
    email: true,
    orders: true,
    stock: true,
  },
  twoFactorEnabled: false,
}

const normalizeSettings = (settings = {}) => ({
  ...DEFAULT_SETTINGS,
  ...settings,
  notifications: {
    ...DEFAULT_SETTINGS.notifications,
    ...(settings.notifications || {}),
  },
})

function Topbar() {
  const navigate = useNavigate()
  const menuRef = useRef(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [settingsMessage, setSettingsMessage] = useState("")
  const [settingsData, setSettingsData] = useState(DEFAULT_SETTINGS)

  const token = localStorage.getItem("token")
  const rawUser = localStorage.getItem("user")
  const user = rawUser ? JSON.parse(rawUser) : {}

  const applyTheme = (theme) => {
    document.documentElement.setAttribute("data-theme", theme)
    document.body.classList.toggle("light-theme", theme === "light")
    document.body.classList.toggle("dark-theme", theme !== "light")
  }

  const getStoredSettings = () => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
      if (!stored) {
        return DEFAULT_SETTINGS
      }

      const parsed = JSON.parse(stored)
      return normalizeSettings(parsed)
    } catch (storageError) {
      console.error("Failed to parse stored settings:", storageError)
      return DEFAULT_SETTINGS
    }
  }

  const fetchSettingsFromApi = async () => {
    const response = await apiClient.get("/users/preferences")
    return normalizeSettings(response.data?.settings || {})
  }

  const saveSettingsToApi = async (nextSettings) => {
    const response = await apiClient.put("/users/preferences", nextSettings)
    return normalizeSettings(response.data?.settings || nextSettings)
  }

  useEffect(() => {
    const initializeSettings = async () => {
      try {
        const serverSettings = await fetchSettingsFromApi()
        setSettingsData(serverSettings)
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(serverSettings))
        applyTheme(serverSettings.theme)
      } catch (apiError) {
        const localSettings = getStoredSettings()
        setSettingsData(localSettings)
        applyTheme(localSettings.theme)
      }
    }

    initializeSettings()
  }, [])

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

  const handleOpenSettings = async () => {
    setSettingsMessage("")
    try {
      const serverSettings = await fetchSettingsFromApi()
      setSettingsData(serverSettings)
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(serverSettings))
      applyTheme(serverSettings.theme)
    } catch (apiError) {
      setSettingsData(getStoredSettings())
    }
    setShowSettingsModal(true)
  }

  const handleSettingsChange = (e) => {
    const { name, value } = e.target
    setSettingsData((prev) => ({ ...prev, [name]: value }))
  }

  const handleNotificationChange = (e) => {
    const { name, checked } = e.target
    setSettingsData((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [name]: checked,
      },
    }))
  }

  const handleToggleTwoFactor = () => {
    setSettingsData((prev) => ({
      ...prev,
      twoFactorEnabled: !prev.twoFactorEnabled,
    }))
    setSettingsMessage("2FA preference updated. Click Save Settings to apply.")
  }

  const handleSaveSettings = async () => {
    try {
      const savedSettings = await saveSettingsToApi(settingsData)
      setSettingsData(savedSettings)
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(savedSettings))
      applyTheme(savedSettings.theme)
      setSettingsMessage("Settings saved successfully")
      setTimeout(() => {
        setShowSettingsModal(false)
        setSettingsMessage("")
      }, 900)
    } catch (apiError) {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsData))
      applyTheme(settingsData.theme)
      setSettingsMessage("Settings saved locally (server unavailable)")
    }
  }

  const handleChangePassword = () => {
    setShowSettingsModal(false)
    navigate("/forgot-password", { state: { email: user?.email || "" } })
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-content">
          {/* Left - Title/Breadcrumb */}
          <div className="topbar-left">
            <h2 className="topbar-title">Inventra</h2>
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
            <div className="topbar-user-menu" ref={menuRef}>
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
                <span className="topbar-user-name">{user?.name || "User"}</span>
                <span className={`menu-arrow ${showUserMenu ? "open" : ""}`}>▼</span>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="topbar-dropdown">
                  <div className="dropdown-header">
                    <div className="user-info">
                      <strong>{user?.name}</strong>
                      <small>{user?.email}</small>
                      <span className="user-role">{user?.role}</span>
                    </div>
                  </div>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item" onClick={() => {
                    setShowUserMenu(false)
                    setShowProfileModal(true)
                  }}>
                    👤 Profile
                  </button>
                  <button className="dropdown-item" onClick={() => {
                    setShowUserMenu(false)
                    handleOpenSettings()
                  }}>
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

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>User Profile</h3>
              <button
                className="modal-close"
                onClick={() => setShowProfileModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="profile-info">
              <div className="profile-avatar">
                <div className="avatar-large">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
              </div>
              <div className="profile-details">
                <div className="profile-field">
                  <label>Name</label>
                  <p>{user?.name || "N/A"}</p>
                </div>
                <div className="profile-field">
                  <label>Email</label>
                  <p>{user?.email || "N/A"}</p>
                </div>
                <div className="profile-field">
                  <label>Role</label>
                  <p className="role-badge">{user?.role?.toUpperCase() || "N/A"}</p>
                </div>
                <div className="profile-field">
                  <label>Member Since</label>
                  <p>{new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowProfileModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Settings</h3>
              <button
                className="modal-close"
                onClick={() => setShowSettingsModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="settings-content">
              {settingsMessage && <div className="alert alert-success">{settingsMessage}</div>}

              <div className="settings-section">
                <h4>Preferences</h4>
                <div className="settings-item">
                  <label>Theme</label>
                  <select name="theme" value={settingsData.theme} onChange={handleSettingsChange}>
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </div>
                <div className="settings-item">
                  <label>Language</label>
                  <select name="language" value={settingsData.language} onChange={handleSettingsChange}>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                  </select>
                </div>
              </div>

              <div className="settings-section">
                <h4>Notifications</h4>
                <div className="settings-item checkbox">
                  <input
                    type="checkbox"
                    id="emailNotif"
                    name="email"
                    checked={settingsData.notifications.email}
                    onChange={handleNotificationChange}
                  />
                  <label htmlFor="emailNotif">Email Notifications</label>
                </div>
                <div className="settings-item checkbox">
                  <input
                    type="checkbox"
                    id="orderNotif"
                    name="orders"
                    checked={settingsData.notifications.orders}
                    onChange={handleNotificationChange}
                  />
                  <label htmlFor="orderNotif">Order Alerts</label>
                </div>
                <div className="settings-item checkbox">
                  <input
                    type="checkbox"
                    id="stockNotif"
                    name="stock"
                    checked={settingsData.notifications.stock}
                    onChange={handleNotificationChange}
                  />
                  <label htmlFor="stockNotif">Stock Alerts</label>
                </div>
              </div>

              <div className="settings-section">
                <h4>Account</h4>
                <button className="settings-btn" onClick={handleChangePassword}>Change Password</button>
                <button className="settings-btn" onClick={handleToggleTwoFactor}>
                  {settingsData.twoFactorEnabled ? "Disable" : "Enable"} Two-Factor Authentication
                </button>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowSettingsModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveSettings}
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Topbar
