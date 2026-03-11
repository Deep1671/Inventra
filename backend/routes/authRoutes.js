const express = require("express")
const router = express.Router()
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const User = require("../models/user")

const authMiddleware = require("../middleware/authmiddleware")
const roleMiddleware = require("../middleware/rolemiddleware")

// ==========================
// REGISTER USER
// ==========================
// First user can register freely (bootstrap admin)
// After that → only admin can create users

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" })
    }

    const userCount = await User.countDocuments()

    // If first user → allow registration as admin
    if (userCount > 0) {
      assignedRole = role || "manager"
    }   

    if (userCount > 0) {
      // Require admin authentication for further registrations
      if (!req.headers.authorization) {
        return res.status(401).json({ message: "Admin token required" })
      }

     const authHeader = req.headers.authorization

    if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Invalid token format" })
    }

    const token = authHeader.split(" ")[1]
    let decoded
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch (err) {
        return res.status(401).json({ message: "Invalid token signature" })
    }
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
    res.status(500).json({ message: "Registration error", error })
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

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" })
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
    res.status(500).json({ message: "Login error", error })
  }
})

module.exports = router