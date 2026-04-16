const express = require("express")
const router = express.Router()

const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { OAuth2Client } = require("google-auth-library")
const crypto = require("crypto")

const User = require("../models/user")
const sendEmail = require("../utils/sendEmail")

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)


// PASSWORD VALIDATION REGEX
const passwordRegex =
/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/



// ==========================
// REGISTER USER
// ==========================
router.post("/register", async (req, res) => {

  try {

    const { name, email, password, role } = req.body

    if(!passwordRegex.test(password)){
      return res.status(400).json({
        message:
        "Password must be at least 8 characters and include 1 uppercase letter, 1 number and 1 special character"
      })
    }

    const existingUser = await User.findOne({ email })

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" })
    }

    const userCount = await User.countDocuments()

    let assignedRole

    // First user becomes admin
    if (userCount === 0) {

      assignedRole = "admin"

    } else {

      if (!req.headers.authorization) {
        return res.status(401).json({ message: "Admin token required" })
      }

      const authHeader = req.headers.authorization

      if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Invalid token format" })
      }

      const token = authHeader.split(" ")[1]

      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      if (decoded.role !== "admin") {
        return res.status(403).json({ message: "Only admin can create users" })
      }

      assignedRole = role || "manager"
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: assignedRole
    })

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })

  } catch (error) {

    res.status(500).json({
      message: "Registration error",
      error
    })

  }

})



// ==========================
// LOGIN
// ==========================
router.post("/login", async (req, res) => {

  try {

    const { email, password } = req.body

    const user = await User.findOne({ email })

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    if(!user.password){
      return res.status(400).json({
        message:"Please login using Google authentication"
      })
    }
    if(user.accountLockedUntil && user.accountLockedUntil > Date.now()){
        return res.status(403).json({
          message:"Account locked. Try again later."
        })
    } 
    const isMatch = await bcrypt.compare(password, user.password)

    if (!isMatch) {

  user.failedLoginAttempts += 1

  if(user.failedLoginAttempts >= 5){
    user.accountLockedUntil = Date.now() + 15*60*1000
  }

  await user.save()

  return res.status(400).json({
    message:"Invalid credentials"
  })
}

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    )

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })

  } catch (error) {

    res.status(500).json({
      message: "Login error",
      error
    })

  }

})



// ==========================
// GOOGLE AUTH
// ==========================
router.post("/google", async (req, res) => {

  try {

    const { token } = req.body

    if (!token) {
      return res.status(400).json({
        message: "Google credential token is required"
      })
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({
        message: "GOOGLE_CLIENT_ID is not configured on the server"
      })
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    })

    const payload = ticket.getPayload()

    if (!payload?.email) {
      return res.status(400).json({
        message: "Google account email was not returned"
      })
    }

    const email = payload.email
    const name = payload.name

    let user = await User.findOne({ email })

    if (!user) {

      user = await User.create({
        name,
        email,
        password: null,
        provider: "google",
        role: "manager"
      })

    }

    const jwtToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    )

    res.json({
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })

  } catch (error) {
    console.error("Google authentication failed:", error.message)

    const isGoogleTokenError =
      error.message?.includes("Wrong recipient") ||
      error.message?.includes("Token used too late") ||
      error.message?.includes("Invalid token signature")

    res.status(isGoogleTokenError ? 401 : 500).json({
      message: error.message || "Google authentication failed"
    })

  }

})



// ==========================
// FORGOT PASSWORD
// ==========================
router.post("/forgot-password", async (req,res)=>{

  try{

    const { email } = req.body

    const user = await User.findOne({ email })

    if(!user){
      return res.status(404).json({
        message:"User not found"
      })
    }

    if(user.provider === "google"){
      return res.status(400).json({
        message:"Password reset not allowed for Google accounts"
      })
    }

    const resetToken = crypto.randomBytes(32).toString("hex")

    user.passwordResetToken = resetToken
    user.passwordResetExpires = Date.now() + 3600000

    await user.save()

    const resetLink =
      `${process.env.FRONTEND_URL}/reset-password/${resetToken}`

    await sendEmail(
      user.email,
      "Password Reset",
      `Click the link to reset your password:\n${resetLink}`
    )

    res.json({
      message:"Reset password link sent to user email"
    })

  }catch(error){

    res.status(500).json({
      message:"Error sending email",
      error
    })

  }

})



// ==========================
// RESET PASSWORD
// ==========================
router.post("/reset-password/:token", async (req,res)=>{

  try{

    const { password } = req.body
    const { token } = req.params

    if(!passwordRegex.test(password)){
      return res.status(400).json({
        message:
        "Password must be at least 8 characters and include 1 uppercase letter, 1 number and 1 special character"
      })
    }

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    })

    if(!user){
      return res.status(400).json({
        message:"Invalid or expired reset token"
      })
    }

    const isSamePassword = await bcrypt.compare(password,user.password)

    if(isSamePassword){
      return res.status(400).json({
        message:"New password cannot be same as old password"
      })
    }

    const hashedPassword = await bcrypt.hash(password,10)

    user.password = hashedPassword
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined

    await user.save()

    res.json({
      message:"Password reset successful"
    })

  }catch(error){

    res.status(500).json({
      message:"Error resetting password",
      error
    })

  }

})



module.exports = router