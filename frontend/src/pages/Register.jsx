import "../styles/register.css"
import { useState } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import logo from "../assets/Inventra.png"
const token = localStorage.getItem("token")

function Register(){

const navigate = useNavigate()

const [form,setForm] = useState({
name:"",
email:"",
password:"",
confirmPassword:"",
role:"manager"
})

const [error,setError] = useState("")
const [showPassword,setShowPassword] = useState(false)
const [showConfirmPassword,setShowConfirmPassword] = useState(false)
const handleChange=(e)=>{
setForm({...form,[e.target.name]:e.target.value})
}

const handleSubmit=async(e)=>{
e.preventDefault()
setError("")

// password validation
if(form.password !== form.confirmPassword){
setError("Passwords does not match")
return
}

try{

await axios.post("http://localhost:5000/api/auth/register",{
name:form.name,
email:form.email,
password:form.password,
role:form.role
},
{
    headers:{
      Authorization:`Bearer ${token}`
    }
})

alert("User created successfully")
navigate("/")

}catch(err){
setError(`Registration failed: ${err.message}`)
}

}

return(

<div className="auth-container">

<div className="auth-card">

<img src={logo} alt="Inventra" className="logo"/>

<h1>Create your Inventra account</h1>

<p className="subtitle">
Start managing your inventory smarter
</p>

{error && <p className="error">{error}</p>}

<form onSubmit={handleSubmit}>

<div className="input-wrapper">
<span>👤</span>
<input
type="text"
name="name"
placeholder="Full Name"
onChange={handleChange}
required
/>
</div>

<div className="input-wrapper">
<span>📧</span>
<input
type="email"
name="email"
placeholder="Email"
onChange={handleChange}
required
/>
</div>

<div className="input-wrapper">
  <span>🔑</span>

  <input
    type={showPassword ? "text" : "password"}
    name="password"
    placeholder="Password"
    value={form.password}
    onChange={handleChange}
    required
  />

  <button
    type="button"
    className="toggle-password"
    onClick={() => setShowPassword(!showPassword)}
  >
    {showPassword ? "🙈" : "👁"}
  </button>
</div>

<div className="input-wrapper">
  <span>🔐</span>

  <input
    type={showConfirmPassword ? "text" : "password"}
    name="confirmPassword"
    placeholder="Confirm Password"
    value={form.confirmPassword}
    onChange={handleChange}
    required
  />

  <button
    type="button"
    className="toggle-password"
    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
  >
    {showConfirmPassword ? "🙈" : "👁"}
  </button>
</div>

<div className="input-wrapper">
<span>👥</span>
<select name="role" onChange={handleChange}>
<option value="manager">Manager</option>
<option value="admin">Admin</option>
</select>

</div>

<button type="submit" className="register-btn">
Register
</button>

</form>


<div className="footer">
© 2026 Inventra — Inventory Intelligence Platform
</div>

</div>

</div>

)

}

export default Register