import { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
} from "recharts";

function Dashboard() {
  const [data, setData] = useState({
  total_revenue: 0,
  total_quantity_sold: 0,
  avg_daily_sales: 0,
  top_products_by_quantity: [],
  top_products_by_revenue: [],
  low_stock_alerts: []
});

  useEffect(() => {
  const fetchDashboard = async () => {
    try {

      const token = localStorage.getItem("token")

      const res = await axios.get(
        "http://localhost:5000/api/analytics/dashboard",
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      setData(res.data)

    } catch (err) {
      console.error("Dashboard error:", err)
    }
  }

  fetchDashboard()
}, [])

  if (!data) return <h2>Loading dashboard...</h2>;

  return (
    <div style={{ padding: "40px" }}>
      <h1>Inventory Analytics Dashboard</h1>

      {/* KPI Cards */}
      <div style={{ display: "flex", gap: "40px", marginBottom: "40px" }}>
        <div>
          <h3>Total Revenue</h3>
          <p>₹{data.total_revenue}</p>
        </div>

        <div>
          <h3>Total Quantity Sold</h3>
          <p>{data.total_quantity_sold}</p>
        </div>

        <div>
          <h3>Average Daily Sales</h3>
          <p>{data.avg_daily_sales ? Math.round(data.avg_daily_sales) : 0}</p>
        </div>
      </div>

      {/* Top Products by Quantity */}
      <h2>Top Products (Quantity)</h2>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data.top_products_by_quantity}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="totalQuantity" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>

      {/* Top Products by Revenue */}
      <h2 style={{ marginTop: "50px" }}>Top Products (Revenue)</h2>

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data.top_products_by_revenue}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="totalRevenue" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>

      {/* Low Stock Alerts */}
<h2 style={{ marginTop: "50px" }}>Low Stock Alerts</h2>

<ul>
  {data?.low_stock_alerts && data.low_stock_alerts.length > 0 ? (
    data.low_stock_alerts.map((item, index) => (
      <li key={index}>
        {item.name} — Stock: {item.current_stock}
      </li>
    ))
  ) : (
    <p>No low stock alerts</p>
  )}
</ul>
    </div>
  );
}

export default Dashboard;