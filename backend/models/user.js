const mongoose = require("mongoose")

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    password: {
      type: String,
      default: null
    },
    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local"
    },
    role: {
      type: String,
      enum: ["admin", "manager"],
      default: "manager"
    },

    passwordResetToken:{
      type:String
    },

    passwordResetExpires:{
      type:Date
    },
    failedLoginAttempts:{
      type:Number,
      default:0
    },
    accountLockedUntil:{
      type:Date
    }
  },
  { timestamps: true }
)

module.exports = mongoose.model("User", userSchema)