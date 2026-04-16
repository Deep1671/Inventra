import { useState } from "react"
import axios from "axios"
import { Link } from "react-router-dom"
import logo from "../assets/Inventra.png"
import "../styles/authRecovery.css"

function ForgotPassword(){

  const [email,setEmail] = useState("")
  const [message,setMessage] = useState("")
  const [loading,setLoading] = useState(false)

  const handleSubmit = async (e)=>{
    e.preventDefault()

    setLoading(true)
    setMessage("")

    try{

      const res = await axios.post(
        "http://localhost:5000/api/auth/forgot-password",
        { email }
      )

      setMessage(res.data.message)

    }catch(err){

      if(err.response){
        setMessage(err.response.data.message)
      }else{
        setMessage("Server error")
      }

    }

    setLoading(false)
  }

  return(
    <div className="recovery-page">
      <div className="recovery-card">
        <img src={logo} alt="Inventra" className="recovery-logo" />

        <div className="recovery-header">
          <p className="eyebrow">Account Recovery</p>
          <h2>Forgot your password?</h2>
          <p>Enter your email and we will send you a reset link.</p>
        </div>

        <form onSubmit={handleSubmit} className="recovery-form">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            required
          />

          {message && <div className="recovery-message">{message}</div>}

          <button type="submit" disabled={loading} className="recovery-btn">
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <div className="recovery-footer">
          <Link to="/" className="recovery-link">Back to login</Link>
        </div>
      </div>
    </div>
  )

}

export default ForgotPassword