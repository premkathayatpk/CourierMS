import mongoose from "mongoose";
import { type } from "os";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required."],
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["customer", "driver", "admin"],
      default: "customer",
    },
    vehicleType: {
      type: String,
      enum: ["Bike", "Car", "Van", "Truck"],
      default: "Bike",
    },
    licenseNumber: {
      type: String,
      trim: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    // Real-time location tracking for drivers
    currentLocation: {
      latitude: {
        type: Number,
        default: null,
      },
      longitude: {
        type: Number,
        default: null,
      },
    }, 
  },
  {
    timestamps: true,
  },
);
const User = mongoose.model("User", userSchema);
export default User;
