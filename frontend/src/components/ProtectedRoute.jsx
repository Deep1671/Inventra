import { Navigate, Outlet, useLocation } from "react-router-dom"

function ProtectedRoute({ allowedRoles }) {
  const location = useLocation()
  const token = localStorage.getItem("token")
  const rawUser = localStorage.getItem("user")

  if (!token || !rawUser) {
    return <Navigate to="/" replace state={{ from: location }} />
  }

  let user

  try {
    user = JSON.parse(rawUser)
  } catch {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    return <Navigate to="/" replace state={{ from: location }} />
  }

  if (!user?.role) {
    return <Navigate to="/" replace state={{ from: location }} />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace state={{ from: location }} />
  }

  return <Outlet />
}

export default ProtectedRoute
