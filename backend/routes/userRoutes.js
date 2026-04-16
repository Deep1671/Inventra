const express = require("express")
const router = express.Router()

const User = require("../models/user")
const authMiddleware = require("../middleware/authmiddleware")
const roleMiddleware = require("../middleware/rolemiddleware")

router.use(authMiddleware)


// =============================
// GET ALL USERS (ADMIN)
// =============================

router.get(
"/",
roleMiddleware(["admin"]),
async (req,res)=>{

try{

const users = await User.find().select("-password")

res.json(users)

}catch(err){
res.status(500).json({message:"Error fetching users"})
}

}
)


// =============================
// CREATE USER (ADMIN)
// =============================

router.post(
"/",
roleMiddleware(["admin"]),
async (req,res)=>{

try{

const { name,email,password,role } = req.body

const existing = await User.findOne({email})

if(existing){
return res.status(400).json({message:"User already exists"})
}

const user = new User({
name,
email,
password,
role
})

await user.save()

res.status(201).json({
message:"User created",
user
})

}catch(err){
res.status(500).json({message:"Error creating user"})
}

}
)


// =============================
// UPDATE USER (ADMIN)
// =============================

router.put(
"/:id",
roleMiddleware(["admin"]),
async (req,res)=>{

try{

const updatedUser = await User.findByIdAndUpdate(
req.params.id,
req.body,
{ new:true, runValidators:true }
).select("-password")

if(!updatedUser){
return res.status(404).json({message:"User not found"})
}

res.json(updatedUser)

}catch(err){
res.status(500).json({message:"Error updating user"})
}

}
)


// =============================
// DELETE USER (ADMIN)
// =============================

router.delete(
"/:id",
roleMiddleware(["admin"]),
async (req,res)=>{

try{

const user = await User.findById(req.params.id)

if(!user){
return res.status(404).json({message:"User not found"})
}

await user.deleteOne()

res.json({message:"User deleted successfully"})

}catch(err){
res.status(500).json({message:"Error deleting user"})
}

}
)


// =============================
// ADMIN RESET PASSWORD
// =============================

router.patch(
"/:id/reset-password",
roleMiddleware(["admin"]),
async (req,res)=>{

try{

const { password } = req.body

if(!password){
return res.status(400).json({message:"Password required"})
}

const user = await User.findById(req.params.id)

if(!user){
return res.status(404).json({message:"User not found"})
}

user.password = password
await user.save()

res.json({message:"Password reset successfully"})

}catch(err){
res.status(500).json({message:"Error resetting password"})
}

}
)


// =============================
// USER CHANGE OWN PASSWORD
// =============================

router.patch(
"/change-password",
authMiddleware,
async (req,res)=>{

try{

const { currentPassword,newPassword } = req.body

const user = await User.findById(req.user.id)

if(!user){
return res.status(404).json({message:"User not found"})
}

const bcrypt = require("bcrypt")

const match = await bcrypt.compare(currentPassword,user.password)

if(!match){
return res.status(400).json({message:"Current password incorrect"})
}

user.password = newPassword
await user.save()

res.json({message:"Password updated successfully"})

}catch(err){
res.status(500).json({message:"Password change error"})
}

}
)

module.exports = router