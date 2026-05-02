import { useEffect, useState } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import Sidebar from "../components/Sidebar"
import "../styles/users.css"

function Users(){

const navigate = useNavigate()

const [users,setUsers] = useState([])
const [loading,setLoading] = useState(true)

const token = localStorage.getItem("token")

const rawUser = localStorage.getItem("user")
const currentUser = rawUser ? JSON.parse(rawUser) : null

// FETCH USERS

const fetchUsers = async()=>{

try{

const res = await axios.get(
`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/users`,
{
headers:{ Authorization:`Bearer ${token}` }
}
)

setUsers(res.data)

}catch(err){

console.error("Error fetching users",err)
alert("Failed to load users")

}

setLoading(false)

}

useEffect(()=>{
fetchUsers()
},[])


// DELETE USER

const handleDelete = async(id)=>{

if(id === currentUser._id){
alert("You cannot delete your own account")
return
}

if(!window.confirm("Delete user?")) return

try{

await axios.delete(
`http://localhost:5000/api/users/${id}`,
{
headers:{ Authorization:`Bearer ${token}` }
}
)

fetchUsers()

}catch(err){
alert("Delete failed")
}

}


// RESET PASSWORD

const handleResetPassword = async(id)=>{

const newPassword = prompt("Enter new password")

if(!newPassword) return

try{

await axios.patch(
`http://localhost:5000/api/users/${id}/reset-password`,
{ password:newPassword },
{
headers:{ Authorization:`Bearer ${token}` }
}
)

alert("Password updated")

}catch(err){
alert("Password reset failed")
}

}


if(loading){
return <div className="users-wrapper"><Sidebar /><div className="users-container"><p>Loading users...</p></div></div>
}


return(

<div className="users-wrapper">

<Sidebar />

<div className="users-container">

{/* HEADER */}

<div className="users-header">

<h2>👥 <span className="gradient-text">Users</span></h2>

</div>

<table className="users-table">

<thead>

<tr>
<th>Name</th>
<th>Email</th>
<th>Role</th>

{currentUser?.role === "admin" && (
<th>Actions</th>
)}

</tr>

</thead>

<tbody>

{users.map(user=>(

<tr key={user._id}>

<td>{user.name}</td>
<td>{user.email}</td>
<td>{user.role}</td>

{currentUser?.role === "admin" && (

<td>

<button
className="delete-btn"
onClick={()=>handleDelete(user._id)}
>
Delete
</button>

<button
className="reset-btn"
onClick={()=>handleResetPassword(user._id)}
>
Reset Password
</button>

</td>

)}

</tr>

))}

</tbody>

</table>

</div>

</div>

)
}
export default Users
