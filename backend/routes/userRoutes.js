const express = require("express")
const router = express.Router()
const bcrypt = require("bcryptjs")

const User = require("../models/user")
const authMiddleware = require("../middleware/authmiddleware")
const roleMiddleware = require("../middleware/rolemiddleware")

router.use(authMiddleware)

const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/

const buildUserSettings = (user) => ({
	theme: user?.preferences?.theme || "dark",
	language: user?.preferences?.language || "en",
	notifications: {
		email: user?.preferences?.notifications?.email ?? true,
		orders: user?.preferences?.notifications?.orders ?? true,
		stock: user?.preferences?.notifications?.stock ?? true
	},
	twoFactorEnabled: user?.security?.twoFactorEnabled ?? false
})


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

if(!currentPassword || !newPassword){
return res.status(400).json({message:"Current password and new password are required"})
}

if(!passwordRegex.test(newPassword)){
return res.status(400).json({
message:"Password must be at least 8 characters and include 1 uppercase letter, 1 number and 1 special character"
})
}

const user = await User.findById(req.user.id)

if(!user){
return res.status(404).json({message:"User not found"})
}

const match = await bcrypt.compare(currentPassword,user.password)

if(!match){
return res.status(400).json({message:"Current password incorrect"})
}

user.password = await bcrypt.hash(newPassword,10)
await user.save()

res.json({message:"Password updated successfully"})

}catch(err){
res.status(500).json({message:"Password change error"})
}

}
)


// =============================
// GET CURRENT USER SETTINGS
// =============================

router.get(
"/preferences",
async (req,res)=>{

try{

const user = await User.findById(req.user.id)

if(!user){
return res.status(404).json({message:"User not found"})
}

res.json({
message:"Preferences fetched successfully",
settings: buildUserSettings(user)
})

}catch(err){
res.status(500).json({message:"Error fetching preferences"})
}

}
)


// =============================
// UPDATE CURRENT USER SETTINGS
// =============================

router.put(
"/preferences",
async (req,res)=>{

try{

const { theme, language, notifications, twoFactorEnabled } = req.body

const user = await User.findById(req.user.id)

if(!user){
return res.status(404).json({message:"User not found"})
}

if(theme && ["dark","light"].includes(theme)){
	user.preferences = user.preferences || {}
	user.preferences.theme = theme
}

if(language && ["en","es","fr"].includes(language)){
	user.preferences = user.preferences || {}
	user.preferences.language = language
}

if(notifications){
	user.preferences = user.preferences || {}
	user.preferences.notifications = {
		email: notifications.email ?? user.preferences?.notifications?.email ?? true,
		orders: notifications.orders ?? user.preferences?.notifications?.orders ?? true,
		stock: notifications.stock ?? user.preferences?.notifications?.stock ?? true
	}
}

if(typeof twoFactorEnabled === "boolean"){
	user.security = user.security || {}
	user.security.twoFactorEnabled = twoFactorEnabled
}

await user.save()

res.json({
message:"Preferences updated successfully",
settings: buildUserSettings(user)
})

}catch(err){
res.status(500).json({message:"Error updating preferences"})
}

}
)

module.exports = router