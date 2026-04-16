import { useState } from "react"
import axios from "axios"

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

    <div style={{padding:"40px"}}>

      <h2>Forgot Password</h2>

      <form onSubmit={handleSubmit}>

        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          required
        />

        <br/><br/>

        <button type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send Reset Link"}
        </button>

      </form>

      {message && <p>{message}</p>}

    </div>

  )

}

export default ForgotPassword