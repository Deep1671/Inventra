import { lazy, Suspense } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import DashboardLayout from "./layout/DashboardLayout"
import ProtectedRoute from "./components/ProtectedRoute"

// Lazy load all page components for better performance
const Login = lazy(() => import("./pages/login"))
const Dashboard = lazy(() => import("./pages/dashboard"))
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"))
const ResetPassword = lazy(() => import("./pages/ResetPassword"))
const Register = lazy(() => import("./pages/Register"))
const UnifiedSales = lazy(() => import("./pages/UnifiedSales"))
const SalesOrders = lazy(() => import("./pages/SalesOrders"))
const Product = lazy(() => import("./pages/Products"))
const Users = lazy(() => import("./pages/Users"))
const Suppliers = lazy(() => import("./pages/Suppliers"))
const PurchaseOrders = lazy(() => import("./pages/PurchaseOrders"))
const Payments = lazy(() => import("./pages/Payments"))
const Inventory = lazy(() => import("./pages/Inventory"))
const Analytics = lazy(() => import("./pages/Analytics"))
const AdvancedAnalytics = lazy(() => import("./pages/AdvancedAnalytics"))
const Insights = lazy(() => import("./pages/Insights"))
const APIDiagnostics = lazy(() => import("./pages/APIDiagnostics"))
const SimpleAPITest = lazy(() => import("./pages/SimpleAPITest"))

// Loading fallback component
const PageLoader = () => (
  <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px', color: 'white'}}>
    <div>Loading page...</div>
  </div>
)

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/api-diagnostics" element={<APIDiagnostics />} />
          <Route path="/api-simple-test" element={<SimpleAPITest />} />
          
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
            <Route element={<DashboardLayout />}>
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/advanced-analytics" element={<AdvancedAnalytics />} />
              <Route path="/insights" element={<Insights />} />
            </Route>
          </Route>
          
          <Route element={<ProtectedRoute allowedRoles={["admin"]}/>}>
            <Route path="/register" element={<Register />} />
          </Route>
          
          <Route element={<ProtectedRoute allowedRoles={["admin","manager"]}/>}>
            <Route path="/users" element={<Users/>}/>
          </Route>
          
          <Route path="*" element={<h2 style={{color: 'white', textAlign: 'center', marginTop: '50px'}}>Page Not Found</h2>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App