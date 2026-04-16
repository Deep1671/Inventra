import { useEffect, useState } from "react"
import api from "../services/apiClient"
import ProductModal from "../components/ProductModel"
import "../styles/product.css"

function Products() {

const [products,setProducts] = useState([])
const [search,setSearch] = useState("")
const [showModal,setShowModal] = useState(false)
const [editingProduct,setEditingProduct] = useState(null)

const [currentPage,setCurrentPage] = useState(1)
const productsPerPage = 10

const totalProducts = products.length

const lowStockCount = products.filter(
p => p.current_stock <= p.reorder_point
).length

const inventoryValue = products.reduce(
(total,p)=> total + (p.current_stock * p.selling_price),
0
)

/* FETCH PRODUCTS */
const fetchProducts = async () => {
try{
console.log("Fetching products...");
const res = await api.get("/products")
console.log("Products fetched:", res.data.length);
setProducts(res.data)
}catch(err){
console.error("Error fetching products:", err)
}
}

useEffect(()=>{
fetchProducts()
},[])

// Listen for inventory updates from other components (like PO delivery)
useEffect(() => {
const handleInventoryUpdate = (event) => {
console.log("🔄 Products page - Inventory updated event received:", event.detail);
console.log("🔄 Refreshing products data due to external update...");
fetchProducts();
};

window.addEventListener('inventoryUpdated', handleInventoryUpdate);

return () => {
window.removeEventListener('inventoryUpdated', handleInventoryUpdate);
};
}, []);


/* DELETE PRODUCT */

const handleDelete = async(id)=>{

if(!window.confirm("Delete this product?")) return

try{

await api.delete(`/products/${id}`)

fetchProducts()

}catch(err){
console.error("Error deleting product:", err)
}

}


/* SEARCH FILTER */

const filteredProducts = products.filter(p =>
p.name.toLowerCase().includes(search.toLowerCase())
)

/* PAGINATION LOGIC */

const indexOfLastProduct = currentPage * productsPerPage
const indexOfFirstProduct = indexOfLastProduct - productsPerPage

const currentProducts = filteredProducts.slice(
indexOfFirstProduct,
indexOfLastProduct
)

const totalPages = Math.ceil(filteredProducts.length / productsPerPage)


return(

<div className="products-container">

<div className="products-header">

<h2>Products</h2>

<button
className="add-product-btn"
onClick={()=>{
setEditingProduct(null)
setShowModal(true)
}}
>
+ Add Product
</button>

</div>
<div className="product-analytics">

<div className="analytics-card">

<h4>Total Products</h4>
<p>{totalProducts}</p>

</div>

<div className="analytics-card">

<h4>Low Stock Items</h4>
<p className="low-stock-number">{lowStockCount}</p>

</div>

<div className="analytics-card">

<h4>Total Inventory Value</h4>
<p>₹ {inventoryValue.toLocaleString()}</p>

</div>

</div>

{/* SEARCH */}

<input
className="products-search"
placeholder="Search product..."
value={search}
onChange={(e)=>{
setSearch(e.target.value)
setCurrentPage(1)
}}
/>


{/* TABLE */}

<table className="products-table">

<thead>
<tr>
<th>Name</th>
<th>Stock</th>
<th>Reorder</th>
<th>Price</th>
<th>Actions</th>

</tr>
</thead>

<tbody>

{currentProducts.map(p=>(

<tr key={p._id}>

<td>{p.name}</td>

<td>
<span className={p.current_stock <= p.reorder_point ? "stock-low":"stock-ok"}>
{p.current_stock}
</span>
</td>

<td>{p.reorder_point}</td>

<td>₹ {p.selling_price}</td>

<td>

<button
className="edit-btn"
onClick={()=>{
setEditingProduct(p)
setShowModal(true)
}}
>
Edit
</button>

<button
className="delete-btn"
onClick={()=>handleDelete(p._id)}
>
Delete
</button>

</td>

</tr>

))}

</tbody>

</table>


{/* PAGINATION */}

<div className="pagination">

<button
disabled={currentPage === 1}
onClick={()=>setCurrentPage(currentPage - 1)}
>
Previous
</button>

{Array.from({ length: totalPages }, (_,i)=>(
<button
key={i}
className={currentPage === i+1 ? "active-page" : ""}
onClick={()=>setCurrentPage(i+1)}
>
{i+1}
</button>
))}

<button
disabled={currentPage === totalPages}
onClick={()=>setCurrentPage(currentPage + 1)}
>
Next
</button>

</div>


{/* MODAL */}

{showModal &&

<ProductModal
product={editingProduct}
close={()=>setShowModal(false)}
refresh={fetchProducts}
/>

}

</div>

)

}

export default Products 