import { useEffect, useState } from "react"
import axios from "axios"
import { useApiData } from "../hooks/useCache"
import { useMutation } from "../hooks/useMutation"
import "../styles/sales.css"

const API_BASE_URL = "http://localhost:5000/api"

function Sales(){

const [productId,setProductId] = useState("")
const [quantity,setQuantity] = useState("")

const [page,setPage] = useState(1)
const [selectedSale, setSelectedSale] = useState(null)
const [showModal, setShowModal] = useState(false)

const token = localStorage.getItem("token")

// Fetch products
const { data: products = [], refetch: refetchProducts } = useApiData('/products');

// Fetch sales
const { data: salesData = { data: [], pagination: {} }, refetch: refetchSales } = useApiData(
  `/sales/line-items?page=${page}&limit=15`
);

// Mutation for creating sales
const { mutate: createSale, loading: creating } = useMutation('/sales', {
  method: 'POST',
  autoInvalidate: true
});

const sales = salesData.data || [];
const totalPages = salesData.pagination?.total_pages || 1;

useEffect(()=>{
  refetchProducts()
}, [])


/* CREATE SALE */

const handleSale = async (e) =>{

e.preventDefault()

try{
  await createSale({
    product_id: productId,
    quantity_sold: Number(quantity)
  });

  setProductId("")
  setQuantity("")

  refetchSales()
  refetchProducts()

}catch(err){

alert(err.response?.data?.message || "Sale failed")

}

}

/* SHOW SALE DETAILS */
const showSaleDetails = (sale) => {
  setSelectedSale(sale)
  setShowModal(true)
}

/* CLOSE MODAL */
const closeModal = () => {
  setShowModal(false)
  setSelectedSale(null)
}

/* INITIAL LOAD */

useEffect(()=>{

fetchProducts()
fetchSales(1)

},[])


return(

<div className="sales-page">

<h1>Sales Management</h1>


{/* SALE FORM */}

<div className="sale-form">

<h2>Create Sale</h2>

<form onSubmit={handleSale}>

<select
value={productId}
onChange={(e)=>setProductId(e.target.value)}
required
>

<option value="">Select Product</option>

{products.map(p=>(
<option key={p._id} value={p._id}>
{p.name} (Stock: {p.current_stock})
</option>
))}

</select>

<input
type="number"
placeholder="Quantity"
value={quantity}
onChange={(e)=>setQuantity(e.target.value)}
required
/>

<button type="submit">
Record Sale
</button>

</form>

</div>


{/* SALES TABLE */}

<div className="sales-table-container">

<h2>Recent Sales</h2>

<table>

<thead>
<tr>
<th>Product</th>
<th>Quantity</th>
<th>Revenue</th>
<th>Type</th>
<th>Date</th>
<th>Action</th>
</tr>
</thead>

<tbody>

{sales.length > 0 ? (

sales.map((sale)=>(
<tr key={sale._id}>

<td>{sale.product_name || 'N/A'}</td>

<td>{sale.quantity_sold || 0}</td>

<td>₹ {sale.revenue || 0}</td>

<td>
<span className={`type-badge ${sale.type === 'Legacy Sale' ? 'legacy' : 'order'}`}>
{sale.type}
</span>
</td>

<td>
{sale.createdAt
  ? new Date(sale.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  : 'N/A'
}
</td>

<td>
<button 
className="details-btn"
onClick={() => showSaleDetails(sale)}
>
Details
</button>
</td>

</tr>
))

) : (

<tr>
<td colSpan="6">No sales recorded</td>
</tr>

)}

</tbody>

</table>


{/* PAGINATION */}

<div className="pagination">

<button
disabled={page === 1}
onClick={()=>fetchSales(page - 1)}
>
Previous
</button>

<span>Page {page} of {totalPages}</span>

<button
disabled={page === totalPages}
onClick={()=>fetchSales(page + 1)}
>
Next
</button>

</div>

</div>

{/* SALE DETAILS MODAL */}
{showModal && selectedSale && (
<div className="modal-overlay" onClick={closeModal}>
<div className="modal-content" onClick={(e) => e.stopPropagation()}>
<div className="modal-header">
<h2>Sale Details</h2>
<button className="close-btn" onClick={closeModal}>✕</button>
</div>

<div className="modal-body">
<div className="detail-row">
<label>Product Name:</label>
<span>{selectedSale.product_name}</span>
</div>

<div className="detail-row">
<label>Quantity Sold:</label>
<span>{selectedSale.quantity_sold}</span>
</div>

<div className="detail-row">
<label>Unit Price:</label>
<span>₹ {selectedSale.unit_price ? selectedSale.unit_price.toLocaleString() : 'N/A'}</span>
</div>

<div className="detail-row">
<label>Total Revenue:</label>
<span className="revenue-highlight">₹ {selectedSale.revenue ? selectedSale.revenue.toLocaleString() : '0'}</span>
</div>

{selectedSale.customer_name && (
<div className="detail-row">
<label>Customer:</label>
<span>{selectedSale.customer_name}</span>
</div>
)}

{selectedSale.order_number && (
<div className="detail-row">
<label>Order Number:</label>
<span>{selectedSale.order_number}</span>
</div>
)}

<div className="detail-row">
<label>Type:</label>
<span className={`type-badge ${selectedSale.type === 'Legacy Sale' ? 'legacy' : 'order'}`}>
{selectedSale.type}
</span>
</div>

{selectedSale.payment_method && (
<div className="detail-row">
<label>Payment Method:</label>
<span>{selectedSale.payment_method}</span>
</div>
)}

{selectedSale.status && (
<div className="detail-row">
<label>Status:</label>
<span className={`status-badge ${selectedSale.status.toLowerCase()}`}>
{selectedSale.status}
</span>
</div>
)}

<div className="detail-row">
<label>Date:</label>
<span>
{selectedSale.createdAt
  ? new Date(selectedSale.createdAt).toLocaleString('en-IN')
  : 'N/A'
}
</span>
</div>

<div className="detail-row">
<label>Sale ID:</label>
<span className="id-small">{selectedSale._id}</span>
</div>
</div>

<div className="modal-footer">
<button className="close-btn-footer" onClick={closeModal}>Close</button>
</div>
</div>
</div>
)}

</div>

)

}

export default Sales
