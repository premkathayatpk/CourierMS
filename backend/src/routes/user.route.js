import express from "express";
import {
  getCurrentUser,
  getAllDrivers,
  getAllUsers,
  getActiveDriversWithLocations,
  updateDriverLocation,
  updateDriverStatus,
  updateProfile,
  updateAvatar,
  removeAvatar,
} from "../controllers/user.controller.js";
import { imageUpload } from "../middleware/upload.middleware.js";
import { protect } from "../middleware/auth.middleware.js";
import authorize from "../middleware/role.middleware.js";

const userRouter = express.Router();

userRouter.get("/me", protect, getCurrentUser);
userRouter.put("/profile", protect, updateProfile);
userRouter.put("/avatar", protect, imageUpload("avatars"), updateAvatar);
userRouter.delete("/avatar", protect, removeAvatar);

// Drivers listing (admin dispatch)
userRouter.get("/drivers", protect, authorize("admin"), getAllDrivers);

// Driver actions
userRouter.patch("/driver/location", protect, authorize("driver"), updateDriverLocation);
userRouter.patch("/driver/status", protect, authorize("driver"), updateDriverStatus);

// Admin actions
userRouter.get("/all", protect, authorize("admin"), getAllUsers);
userRouter.get("/active-drivers", protect, authorize("admin"), getActiveDriversWithLocations);

export default userRouter;
