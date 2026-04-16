import { useEffect, useState } from "react"
import axios from "axios"
import "../styles/sales.css"

const API_BASE_URL = "http://localhost:5000/api"

function Sales(){

const [products,setProducts] = useState([])
const [sales,setSales] = useState([])

const [productId,setProductId] = useState("")
const [quantity,setQuantity] = useState("")

const [page,setPage] = useState(1)
const [totalPages,setTotalPages] = useState(1)

const token = localStorage.getItem("token")


/* FETCH PRODUCTS */

const fetchProducts = async () =>{

try{

const res = await axios.get(
`${API_BASE_URL}/products`,
{
headers:{ Authorization:`Bearer ${token}` }
})

setProducts(res.data)

}catch(err){
console.error(err)
}

}


/* FETCH SALES */

const fetchSales = async (currentPage = 1) => {

try{

const res = await axios.get(
`${API_BASE_URL}/sales?page=${currentPage}&limit=10`,
{
headers:{ Authorization:`Bearer ${token}` }
}
)

setSales(res.data.data)
setTotalPages(res.data.totalPages)
setPage(currentPage)

}catch(err){
console.error(err)
}

}


/* CREATE SALE */

const handleSale = async (e) =>{

e.preventDefault()

try{

await axios.post(
`${API_BASE_URL}/sales`,
{
product_id:productId,
quantity_sold:Number(quantity)
},
{
headers:{ Authorization:`Bearer ${token}` }
}
)

setProductId("")
setQuantity("")

fetchSales(page)
fetchProducts()

}catch(err){

alert(err.response?.data?.message || "Sale failed")

}

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

<h2>Sales History</h2>

<table>

<thead>
<tr>
<th>Product</th>
<th>Quantity</th>
<th>Revenue</th>
<th>Date</th>
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
{sale.createdAt
  ? new Date(sale.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  : 'N/A'
}
</td>

</tr>
))

) : (

<tr>
<td colSpan="4">No sales recorded</td>
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

</div>

)

}

export default Sales
