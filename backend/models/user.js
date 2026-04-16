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
    },
    preferences: {
      theme: {
        type: String,
        enum: ["dark", "light"],
        default: "dark"
      },
      language: {
        type: String,
        enum: ["en", "es", "fr"],
        default: "en"
      },
      notifications: {
        email: {
          type: Boolean,
          default: true
        },
        orders: {
          type: Boolean,
          default: true
        },
        stock: {
          type: Boolean,
          default: true
        }
      }
    },
    security: {
      twoFactorEnabled: {
        type: Boolean,
        default: false
      }
    }
  },
  { timestamps: true }
)

module.exports = mongoose.model("User", userSchema)