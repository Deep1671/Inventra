import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import { GoogleOAuthProvider } from "@react-oauth/google"
import "./index.css"

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

ReactDOM.createRoot(document.getElementById("root")).render(
  googleClientId ? (
    <GoogleOAuthProvider clientId={googleClientId}>
      <App />
    </GoogleOAuthProvider>
  ) : (
    <App />
  )
)
