import { useState, useEffect } from "react"
import axios from "axios"

function ProductModal({product,close,refresh}){

const token = localStorage.getItem("token")
const [suppliers, setSuppliers] = useState([])

const [form,setForm] = useState({
name:product?.name || "",
category:product?.category || "",
cost_price:product?.cost_price || "",
current_stock:product?.current_stock || "",
reorder_point:product?.reorder_point || "",
selling_price:product?.selling_price || "",
preferred_supplier_id:product?.preferred_supplier_id || "",
low_stock_threshold:product?.low_stock_threshold || "",
reorder_quantity:product?.reorder_quantity || ""
})

useEffect(() => {
  const fetchSuppliers = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/suppliers", {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSuppliers(res.data)
    } catch (err) {
      console.error("Failed to fetch suppliers", err)
    }
  }
  fetchSuppliers()
}, [token])


const handleChange=(e)=>{
const { name, value } = e.target
setForm({
...form,
[name]: name === "cost_price" || name === "current_stock" || name === "reorder_point" || 
         name === "selling_price" || name === "low_stock_threshold" || name === "reorder_quantity" 
         ? (value === "" ? "" : parseFloat(value))
         : value
})
}


const handleSubmit = async(e)=>{
e.preventDefault()

try{

if(product){

await axios.put(
`http://localhost:5000/api/products/${product._id}`,
form,
{
headers:{ Authorization:`Bearer ${token}` }
}
)

}else{

await axios.post(
"http://localhost:5000/api/products",
form,
{
headers:{ Authorization:`Bearer ${token}` }
}
)

}

refresh()
close()

}catch(err){
console.error(err)
}

}


return(

<div className="modal-overlay">

<div className="modal modal-large">

<h3>{product ? "Edit Product" : "Add Product"}</h3>

<form onSubmit={handleSubmit} className="product-form">

<div className="form-column">
<h4>Basic Information</h4>

<input
name="name"
placeholder="Product Name"
value={form.name}
onChange={handleChange}
required
/>

<input
name="category"
placeholder="Category"
value={form.category}
onChange={handleChange}
required
/>

<div className="input-row">
  <input
  name="cost_price"
  type="number"
  placeholder="Cost Price"
  value={form.cost_price}
  onChange={handleChange}
  step="0.01"
  required
  />

  <input
  name="selling_price"
  type="number"
  placeholder="Selling Price"
  value={form.selling_price}
  onChange={handleChange}
  step="0.01"
  required
  />
</div>

<div className="input-row">
  <input
  name="current_stock"
  type="number"
  placeholder="Current Stock"
  value={form.current_stock}
  onChange={handleChange}
  required
  />

  <input
  name="reorder_point"
  type="number"
  placeholder="Reorder Point"
  value={form.reorder_point}
  onChange={handleChange}
  required
  />
</div>
</div>

<div className="form-column">
<h4>Supplier & Inventory Settings</h4>

<select
name="preferred_supplier_id"
value={form.preferred_supplier_id}
onChange={handleChange}
>
<option value="">Select Preferred Supplier</option>
{suppliers.map((supplier) => (
  <option key={supplier._id} value={supplier._id}>
    {supplier.name}
  </option>
))}
</select>

<div className="input-row">
  <input
  name="low_stock_threshold"
  type="number"
  placeholder="Low Stock Threshold"
  value={form.low_stock_threshold}
  onChange={handleChange}
  />

  <input
  name="reorder_quantity"
  type="number"
  placeholder="Reorder Quantity"
  value={form.reorder_quantity}
  onChange={handleChange}
  />
</div>
</div>

<div className="modal-actions">
<button type="submit">
Save
</button>

<button type="button" onClick={close}>
Cancel
</button>
</div>

</form>

</div>

</div>

)

}

export default ProductModal