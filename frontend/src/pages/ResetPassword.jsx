import { useState } from "react"
import axios from "axios"
import { Link, useParams } from "react-router-dom"
import logo from "../assets/Inventra.png"
import "../styles/authRecovery.css"

function ResetPassword(){

  const { token } = useParams()

  const [password,setPassword] = useState("")
  const [message,setMessage] = useState("")
  const [loading,setLoading] = useState(false)

  const handleSubmit = async (e)=>{
    e.preventDefault()

    setLoading(true)
    setMessage("")

    try{

      const res = await axios.post(
         `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/auth/reset-password/${token}`,
        { password }
      )

      setMessage(res.data.message)

    }catch(err){

      if(err.response){
        setMessage(err.response.data.message)
      }else{
        setMessage("Reset password failed")
      }

    }

    setLoading(false)
  }

  return(
    <div className="recovery-page">
      <div className="recovery-card">
        <img src={logo} alt="Inventra" className="recovery-logo" />

        <div className="recovery-header">
          <p className="eyebrow">Set a new password</p>
          <h2>Reset your password</h2>
          <p>Choose a new password for your Inventra account.</p>
        </div>

        <form onSubmit={handleSubmit} className="recovery-form">
          <label htmlFor="password">New password</label>
          <input
            id="password"
            type="password"
            placeholder="Enter new password"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            required
          />

          {message && <div className="recovery-message">{message}</div>}

          <button type="submit" disabled={loading} className="recovery-btn">
            {loading ? "Updating..." : "Reset Password"}
          </button>
        </form>

        <div className="recovery-footer">
          <Link to="/" className="recovery-link">Back to login</Link>
        </div>
      </div>
    </div>
  )

}

export default ResetPassword
