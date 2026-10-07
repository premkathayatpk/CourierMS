import User from "../models/User.js";
import Parcel from "../models/Parcel.js";
import { removeStoredImage } from "../middleware/upload.middleware.js";
import { FLEET } from "../config/fleet.js";
import { vehicleMaxKg } from "../services/algorithms/driverAssignment.js";
import { triggerPendingSweep } from "../services/autoAssign.js";

const VEHICLE_TYPES = User.schema.path("vehicleType").enumValues;

export const getCurrentUser = async (req, res) => {
  // protect middleware has already loaded the user (without password)
  return res.status(200).json({
    success: true,
    message: "Get current user successfully",
    user: req.user,
  });
};

// Get all drivers (for admin dispatch or live map)
export const getAllDrivers = async (req, res) => {
  try {
    const drivers = await User.find({ role: "driver" })
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: drivers.length,
      drivers,
    });
  } catch (error) {
    console.error("Get drivers error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch drivers.",
    });
  }
};

// Admin: Get all users (customers, drivers, admins)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch users.",
    });
  }
};

// Driver: Update current live GPS location
export const updateDriverLocation = async (req, res) => {
  try {
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);

    if (
      req.body.latitude === undefined ||
      req.body.longitude === undefined ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid latitude (-90..90) and longitude (-180..180) are required.",
      });
    }

    const previousFixAt = req.user.locationUpdatedAt;
    const driver = await User.findByIdAndUpdate(
      req.user._id,
      { currentLocation: { latitude, longitude }, locationUpdatedAt: new Date() },
      { returnDocument: "after" }
    ).select("-password");

    // First fresh fix after being away: this driver can now take waiting parcels
    const wasStale =
      !previousFixAt ||
      Date.now() - new Date(previousFixAt).getTime() > FLEET.locationMaxAgeMinutes * 60 * 1000;
    if (driver?.isAvailable && wasStale) triggerPendingSweep("driver GPS available");

    return res.status(200).json({
      success: true,
      message: "Driver location updated successfully",
      driver,
    });
  } catch (error) {
    console.error("Update location error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update location.",
    });
  }
};

// Admin: Get all drivers with current GPS locations and active job count for the fleet map
export const getActiveDriversWithLocations = async (req, res) => {
  try {
    const [drivers, activeCounts] = await Promise.all([
      User.find({ role: "driver" }).select("-password").sort({ updatedAt: -1 }).lean(),
      Parcel.aggregate([
        { $match: { driver: { $ne: null }, status: { $in: ["Assigned", "Picked Up", "In Transit"] } } },
        { $group: { _id: "$driver", count: { $sum: 1 } } },
      ]),
    ]);

    const countByDriver = new Map(activeCounts.map((c) => [c._id.toString(), c.count]));
    const withCounts = drivers.map((d) => ({
      ...d,
      activeParcels: countByDriver.get(d._id.toString()) || 0,
      maxLoadKg: vehicleMaxKg(d.vehicleType),
    }));

    return res.status(200).json({
      success: true,
      count: withCounts.length,
      drivers: withCounts,
    });
  } catch (error) {
    console.error("Get active drivers error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch active drivers.",
    });
  }
};

// Driver: Toggle availability status
export const updateDriverStatus = async (req, res) => {
  try {
    const { isAvailable } = req.body;

    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isAvailable must be true or false.",
      });
    }

    const driver = await User.findByIdAndUpdate(
      req.user._id,
      { isAvailable },
      { returnDocument: "after" }
    ).select("-password");

    if (isAvailable) triggerPendingSweep("driver online");

    return res.status(200).json({
      success: true,
      message: "Driver status updated successfully",
      driver,
    });
  } catch (error) {
    console.error("Update driver status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update status.",
    });
  }
};

// Update profile details
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, vehicleType, licenseNumber } = req.body;
    const updateData = {};

    if (name && String(name).trim()) updateData.name = String(name).trim();
    if (phone && String(phone).trim()) updateData.phone = String(phone).trim();

    // Vehicle details only make sense for drivers
    if (req.user.role === "driver") {
      if (vehicleType) {
        if (!VEHICLE_TYPES.includes(vehicleType)) {
          return res.status(400).json({
            success: false,
            message: `Vehicle type must be one of: ${VEHICLE_TYPES.join(", ")}.`,
          });
        }
        updateData.vehicleType = vehicleType;
      }
      if (licenseNumber !== undefined) updateData.licenseNumber = String(licenseNumber).trim();
    }

    const user = await User.findByIdAndUpdate(req.user._id, updateData, {
      returnDocument: "after",
      runValidators: true,
    }).select("-password");

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update profile.",
    });
  }
};

// Upload / replace profile photo (multipart field "image")
export const updateAvatar = async (req, res) => {
  try {
    const previous = req.user.avatar;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: req.uploadedImage },
      { returnDocument: "after" }
    ).select("-password");

    await removeStoredImage(previous);

    return res.status(200).json({ success: true, message: "Profile photo updated", user });
  } catch (error) {
    await removeStoredImage(req.uploadedImage);
    console.error("Update avatar error:", error);
    return res.status(500).json({ success: false, message: "Failed to update profile photo." });
  }
};

export const removeAvatar = async (req, res) => {
  try {
    const previous = req.user.avatar;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: "" },
      { returnDocument: "after" }
    ).select("-password");

    await removeStoredImage(previous);

    return res.status(200).json({ success: true, message: "Profile photo removed", user });
  } catch (error) {
    console.error("Remove avatar error:", error);
    return res.status(500).json({ success: false, message: "Failed to remove profile photo." });
  }
};
