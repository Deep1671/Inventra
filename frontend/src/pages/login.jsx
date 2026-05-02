import { useState, useEffect } from "react"
import axios from "axios"
import { useNavigate, Link } from "react-router-dom"
import { GoogleLogin } from "@react-oauth/google"
import "../styles/login.css"
import Inventra from "../assets/InventraLogo.png"

const normalizeApiBaseUrl = (value) => {
  const trimmed = (value || "http://localhost:5000").replace(/\/$/, "")
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`
}

function Login() {
  const navigate = useNavigate()
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  const [formData, setFormData] = useState({ email: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) navigate("/dashboard")
  }, [navigate])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const apiBase = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL)
      const res = await axios.post(`${apiBase}/auth/login`, formData)
      localStorage.setItem("token", res.data.token)
      localStorage.setItem("user", JSON.stringify(res.data.user))
      navigate("/dashboard")
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.")
    }
    setLoading(false)
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
     const apiBase = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL)
      const res = await axios.post(`${apiBase}/auth/google`, {
        token: credentialResponse.credential,
      })
      localStorage.setItem("token", res.data.token)
      localStorage.setItem("user", JSON.stringify(res.data.user))
      navigate("/dashboard")
    } catch (err) {
      setError(err.response?.data?.message || "Google login failed. Please try again.")
    }
  }

  return (
    <div className="login-page">

      {/* ── Left Branding Panel ── */}
      <div className="login-branding">
        <div className="brand-icon">
          <img src={Inventra} alt="Inventra Logo" />
        </div>
        <h1 className="brand-title">Inventra — Smart Inventory Management Platform</h1>
        <p className="brand-subtitle">
          Manage your stock, track orders, and streamline your supply chain — all in one place.
        </p>
        <div className="brand-features">
          <div className="brand-feature">
            <span>📊</span>
            <span>Real-time analytics &amp; reports</span>
          </div>
          <div className="brand-feature">
            <span>🔔</span>
            <span>Low-stock alerts &amp; notifications</span>
          </div>
          <div className="brand-feature">
            <span>🚚</span>
            <span>Supplier &amp; order management</span>
          </div>
          <div className="brand-feature">
            <span>🔒</span>
            <span>Secure role-based access</span>
          </div>
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="login-form-panel">
        <div className="login-form-inner">

          <div className="login-header">
            <h2>Inventra</h2>
            <h3>Welcome back 👋</h3>
            
            <p>Sign in to your account to continue</p>
          </div>

          {error && (
            <div className="login-error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>

            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <div className="input-wrapper">
                <span className="input-icon">✉️</span>
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔑</span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div className="form-footer">
              <Link to="/forgot-password" className="forgot-link">
                Forgot password?
              </Link>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="login-spinner" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </button>

          </form>

          <div className="login-divider">
            <span>or continue with</span>
          </div>

          <div className="google-login">
            {googleClientId ? (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError("Google login failed")}
                text="signin_with"
                logo_alignment="left"
                width="300"
              />
            ) : (
              <p className="google-login-missing">
                Google Sign-In is unavailable because no Google client ID was found.
                Add `VITE_GOOGLE_CLIENT_ID` to `frontend/.env` or `GOOGLE_CLIENT_ID` to `backend/.env`,
                then restart the Vite dev server.
              </p>
            )}
          </div>
             
        </div>
        <div className="login-footer">
          © 2026 Inventra — Smart Inventory Intelligence Platform- All rights reserved.
        </div>
      </div>
      </div>
  )
}


export default Login
