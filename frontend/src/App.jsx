import { BrowserRouter, Routes, Route } from "react-router-dom"
import Login from "./pages/Login"
import Dashboard from "./pages/dashboard"
import ForgotPassword from "./pages/ForgotPassword"
import ResetPassword from "./pages/ResetPassword"
import Register from "./pages/Register"
import UnifiedSales from "./pages/UnifiedSales"
import SalesOrders from "./pages/SalesOrders"
import DashboardLayout from "./layout/DashboardLayout"
import ProtectedRoute from "./components/ProtectedRoute"
import Product from "./pages/Products"
import Users from "./pages/Users"
import Suppliers from "./pages/Suppliers"
import PurchaseOrders from "./pages/PurchaseOrders"
import Payments from "./pages/Payments"
import Inventory from "./pages/Inventory"

function App() {
return (
<BrowserRouter>
<Routes>
<Route path="/" element={<Login />} />
<Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/reset-password/:token" element={<ResetPassword />} />
<Route element={<ProtectedRoute allowedRoles={["admin","manager"]}/>}>
  <Route element={<DashboardLayout />}>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/products" element={<Product />} />  
    <Route path="/sales" element={<UnifiedSales />} />
    <Route path="/sales-orders" element={<SalesOrders />} />
    <Route path="/suppliers" element={<Suppliers />} />
    <Route path="/purchase-orders" element={<PurchaseOrders />} />
    <Route path="/payments" element={<Payments />} />
    <Route path="/inventory" element={<Inventory />} />
  </Route>
</Route>
<Route element={<ProtectedRoute allowedRoles={["admin"]}/>}>
  <Route path="/register" element={<Register />} />
</Route>
<Route element={<ProtectedRoute allowedRoles={["admin","manager"]}/>}>
  <Route path="/Users" element={<Users/>}/>
</Route>
<Route path="*" element={<h2>Page Not Found</h2>} />
</Routes>
</BrowserRouter>
)
}
export default App