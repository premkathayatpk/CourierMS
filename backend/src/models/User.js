import mongoose from "mongoose";

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
    // Profile photo, stored locally: "/uploads/avatars/<file>"
    avatar: {
      type: String,
      default: "",
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
    // When currentLocation was last reported; stale fixes are ignored by auto-assign
    locationUpdatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);
const User = mongoose.model("User", userSchema);
export default User;
