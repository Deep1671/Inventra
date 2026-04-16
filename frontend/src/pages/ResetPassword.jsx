import { useState } from "react"
import axios from "axios"
import { useParams } from "react-router-dom"

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
        `http://localhost:5000/api/auth/reset-password/${token}`,
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

    <div style={{padding:"40px"}}>

      <h2>Reset Password</h2>

      <form onSubmit={handleSubmit}>

        <input
          type="password"
          placeholder="Enter new password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
          required
        />

        <br/><br/>

        <button type="submit" disabled={loading}>
          {loading ? "Updating..." : "Reset Password"}
        </button>

      </form>

      {message && <p>{message}</p>}

    </div>

  )

}

export default ResetPassword