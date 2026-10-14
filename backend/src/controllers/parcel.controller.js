import Parcel from "../models/Parcel.js";
import User from "../models/User.js";
import genTrackingNum from "../utils/genTrackingNum.js";
import { removeStoredImage } from "../middleware/upload.middleware.js";
import { QuoteError, quoteDelivery } from "../services/quote.js";
import { autoAssignParcel } from "../services/autoAssign.js";
import { canCarry, vehicleMaxKg } from "../services/algorithms/driverAssignment.js";

const ACTIVE_STATUSES = ["Assigned", "Picked Up", "In Transit"];
// Customers may still cancel / change the package photo in these states
const BEFORE_PICKUP = ["Pending", "Assigned"];


const STATUS_TRANSITIONS = {
  driver: {
    Assigned: ["Picked Up"],
    "Picked Up": ["In Transit"],
    "In Transit": ["Delivered"],
  },
  admin: {
    Pending: ["Cancelled"],
    Assigned: ["Picked Up", "Cancelled"],
    "Picked Up": ["In Transit", "Cancelled"],
    "In Transit": ["Delivered", "Cancelled"],
  },
};

const allowedTransitions = (role, current) =>
  (role === "admin" ? STATUS_TRANSITIONS.admin : STATUS_TRANSITIONS.driver)[current] || [];

const PARCEL_TYPES = Parcel.schema.path("parcelType").enumValues;
const MAX_WEIGHT_KG = 1000;

const DRIVER_FIELDS = "name phone vehicleType licenseNumber currentLocation isAvailable avatar";
const CUSTOMER_FIELDS = "name email phone";

const populateParcel = (query) =>
  query.populate("customer", CUSTOMER_FIELDS).populate("driver", DRIVER_FIELDS);

const toCoordinate = (value, min, max) => {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) && num >= min && num <= max ? num : null;
};

// Accepts {latitude, longitude} or {lat, lng}; coordinates are required
// because every point must be checked against the service area.
const normalizeLocation = (location) => ({
  address: String(location?.address || "").trim(),
  lat: toCoordinate(location?.latitude ?? location?.lat, -90, 90),
  lng: toCoordinate(location?.longitude ?? location?.lng, -180, 180),
});

// Shared validation for quote + create
const validateParcelInput = ({ weight, parcelType }) => {
  const weightKg = Number(weight);
  if (!Number.isFinite(weightKg) || weightKg < 0.1 || weightKg > MAX_WEIGHT_KG) {
    throw new QuoteError(`Weight must be between 0.1 and ${MAX_WEIGHT_KG} kg.`);
  }
  const type = parcelType || "Other";
  if (!PARCEL_TYPES.includes(type)) {
    throw new QuoteError(`Parcel type must be one of: ${PARCEL_TYPES.join(", ")}.`);
  }
  return { weightKg, type };
};

// Customer: price estimate before booking (same calculation as create)
export const getQuote = (req, res) => {
  try {
    const { weightKg, type } = validateParcelInput(req.body);
    const quote = quoteDelivery({
      pickup: normalizeLocation(req.body.pickupLocation),
      delivery: normalizeLocation(req.body.deliveryLocation),
      weightKg,
      parcelType: type,
    });
    return res.status(200).json({ success: true, quote });
  } catch (error) {
    if (error instanceof QuoteError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("Quote error:", error);
    return res.status(500).json({ success: false, message: "Failed to calculate price." });
  }
};

// "9851023456" -> "98******56"
const maskPhone = (phone = "") => {
  const value = String(phone);
  if (value.length <= 4) return "****";
  return `${value.slice(0, 2)}${"*".repeat(value.length - 4)}${value.slice(-2)}`;
};

const idEquals = (a, b) => a && b && a.toString() === b.toString();

const canViewParcel = (parcel, user) =>
  user.role === "admin" ||
  idEquals(parcel.customer?._id ?? parcel.customer, user._id) ||
  idEquals(parcel.driver?._id ?? parcel.driver, user._id);

export const createParcel = async (req, res) => {
  try {
    const {
      pickupContact,
      pickupLocation,
      deliveryContact,
      deliveryLocation,
      parcelType,
      weight,
      notes,
    } = req.body;

    if (
      !pickupContact?.name ||
      !pickupContact?.phone ||
      !pickupLocation?.address ||
      !deliveryContact?.name ||
      !deliveryContact?.phone ||
      !deliveryLocation?.address ||
      !weight
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields (contacts, addresses, and weight).",
      });
    }

    const { weightKg, type } = validateParcelInput({ weight, parcelType });
    const pickup = normalizeLocation(pickupLocation);
    const delivery = normalizeLocation(deliveryLocation);

    // Validates the service area and prices from the A* road distance
    const quote = quoteDelivery({ pickup, delivery, weightKg, parcelType: type });

    let trackingNumber;
    do {
      trackingNumber = genTrackingNum();
    } while (await Parcel.exists({ trackingNumber }));

    const parcel = await Parcel.create({
      trackingNumber,
      customer: req.user._id,
      pickupContact: {
        name: String(pickupContact.name).trim(),
        phone: String(pickupContact.phone).trim(),
      },
      pickupLocation: { address: pickup.address, latitude: pickup.lat, longitude: pickup.lng },
      deliveryContact: {
        name: String(deliveryContact.name).trim(),
        phone: String(deliveryContact.phone).trim(),
      },
      deliveryLocation: { address: delivery.address, latitude: delivery.lat, longitude: delivery.lng },
      parcelType: type,
      weight: weightKg,
      price: quote.total,
      distanceKm: quote.distanceKm,
      priceBreakdown: quote.breakdown,
      notes: notes ? String(notes) : "",
      status: "Pending",
    });

    // The booking stands even if auto-assignment fails; the parcel stays
    // Pending for an admin to assign manually.
    let assigned = null;
    try {
      const claimed = await autoAssignParcel(parcel);
      if (claimed) assigned = await populateParcel(Parcel.findById(claimed._id));
    } catch (error) {
      console.error("Auto-assign error:", error);
    }

    return res.status(201).json({
      success: true,
      message: assigned
        ? `Parcel booked and assigned to ${assigned.driver.name}.`
        : "Parcel booked successfully. A driver will be assigned shortly.",
      data: assigned || parcel,
    });
  } catch (error) {
    if (error.name === "ValidationError" || error instanceof QuoteError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("Create Parcel Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create parcel.",
    });
  }
};

// Customer: Get logged in customer's parcels
export const getMyParcel = async (req, res) => {
  try {
    const parcels = await Parcel.find({ customer: req.user._id })
      .populate("driver", DRIVER_FIELDS)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: parcels.length,
      data: parcels,
    });
  } catch (error) {
    console.error("Get My Parcel Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch parcels.",
    });
  }
};

// Driver: Get parcels assigned to the logged in driver
export const getDriverParcels = async (req, res) => {
  try {
    const parcels = await Parcel.find({ driver: req.user._id })
      .populate("customer", CUSTOMER_FIELDS)
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: parcels.length,
      data: parcels,
    });
  } catch (error) {
    console.error("Get Driver Parcels Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch driver parcels.",
    });
  }
};

// Admin: Get all parcels
export const getAllParcel = async (req, res) => {
  try {
    const parcels = await populateParcel(Parcel.find()).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: parcels.length,
      data: parcels,
    });
  } catch (error) {
    console.error("Get All Parcel Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch parcels.",
    });
  }
};

// Get single parcel by ID (owner customer, assigned driver, or admin)
export const getParcelById = async (req, res) => {
  try {
    const parcel = await populateParcel(Parcel.findById(req.params.id));

    if (!parcel || !canViewParcel(parcel, req.user)) {
      // 404 for both cases so parcel IDs can't be probed
      return res.status(404).json({
        success: false,
        message: "Parcel not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: parcel,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({ success: false, message: "Parcel not found." });
    }
    console.error("Get Parcel By Id Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get parcel details.",
    });
  }
};

// Track parcel by tracking number (Public). Returns only what a recipient
// needs to follow the delivery - no customer account data, masked contact
// phones, and the driver's live position only while the delivery is active.
export const trackParcel = async (req, res) => {
  try {
    const trackingNumber = String(req.params.trackingNumber || "").trim().toUpperCase();

    const parcel = await Parcel.findOne({ trackingNumber })
      .populate("driver", "name phone vehicleType currentLocation avatar")
      .lean();

    if (!parcel) {
      return res.status(404).json({
        success: false,
        message: `Parcel with tracking number "${trackingNumber}" was not found.`,
      });
    }

    const isActive = ACTIVE_STATUSES.includes(parcel.status);

    const data = {
      _id: parcel._id,
      trackingNumber: parcel.trackingNumber,
      status: parcel.status,
      parcelType: parcel.parcelType,
      weight: parcel.weight,
      price: parcel.price,
      pickupContact: {
        name: parcel.pickupContact.name,
        phone: maskPhone(parcel.pickupContact.phone),
      },
      deliveryContact: {
        name: parcel.deliveryContact.name,
        phone: maskPhone(parcel.deliveryContact.phone),
      },
      pickupLocation: parcel.pickupLocation,
      deliveryLocation: parcel.deliveryLocation,
      pickedUpAt: parcel.pickedUpAt,
      deliveredAt: parcel.deliveredAt,
      createdAt: parcel.createdAt,
      updatedAt: parcel.updatedAt,
      driver: parcel.driver
        ? {
            _id: parcel.driver._id,
            name: parcel.driver.name,
            vehicleType: parcel.driver.vehicleType,
            avatar: parcel.driver.avatar,
            // Contact and live position only while the courier is on the job
            phone: isActive ? parcel.driver.phone : undefined,
            currentLocation: isActive ? parcel.driver.currentLocation : undefined,
          }
        : null,
    };

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Parcel tracking error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while tracking parcel.",
    });
  }
};

// Admin: Assign driver to parcel
export const assignDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { driverId } = req.body;

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: "Driver ID is required.",
      });
    }

    const parcel = await Parcel.findById(id);
    if (!parcel) {
      return res.status(404).json({
        success: false,
        message: "Parcel not found.",
      });
    }

    // Reassignment is only allowed before the parcel has been collected
    if (!["Pending", "Assigned"].includes(parcel.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot assign a driver to a parcel that is ${parcel.status.toLowerCase()}.`,
      });
    }

    const driver = await User.findOne({ _id: driverId, role: "driver" });
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found.",
      });
    }

    if (!driver.isAvailable) {
      return res.status(400).json({
        success: false,
        message: `${driver.name} is offline and cannot take new deliveries.`,
      });
    }

    if (!canCarry(driver.vehicleType, parcel.weight)) {
      return res.status(400).json({
        success: false,
        message: `A ${driver.vehicleType || "Bike"} can carry up to ${vehicleMaxKg(driver.vehicleType)} kg; this parcel is ${parcel.weight} kg.`,
      });
    }

    parcel.driver = driver._id;
    parcel.status = "Assigned";
    await parcel.save();

    const assignedParcel = await populateParcel(Parcel.findById(parcel._id));

    return res.status(200).json({
      success: true,
      message: `Driver ${driver.name} assigned successfully.`,
      data: assignedParcel,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid parcel or driver ID." });
    }
    console.error("Assign driver error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to assign driver.",
    });
  }
};

// Driver/Admin: Update parcel status (Assigned -> Picked Up -> In Transit -> Delivered)
export const updateParcelStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const parcel = await Parcel.findById(id);
    if (!parcel) {
      return res.status(404).json({
        success: false,
        message: "Parcel not found.",
      });
    }

    const isAdmin = req.user.role === "admin";

    if (!isAdmin && !idEquals(parcel.driver, req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not the driver assigned to this parcel.",
      });
    }

    const allowed = allowedTransitions(req.user.role, parcel.status);

    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: allowed.length
          ? `Cannot change status from "${parcel.status}" to "${status}". Allowed: ${allowed.join(", ")}.`
          : `A parcel that is "${parcel.status}" can no longer be updated.`,
      });
    }

    parcel.status = status;
    if (status === "Picked Up") {
      parcel.pickedUpAt = new Date();
    } else if (status === "Delivered") {
      parcel.deliveredAt = new Date();
    }

    await parcel.save();

    const updatedParcel = await populateParcel(Parcel.findById(parcel._id));

    return res.status(200).json({
      success: true,
      message: `Parcel status updated to ${status}.`,
      data: updatedParcel,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({ success: false, message: "Parcel not found." });
    }
    console.error("Update parcel status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update parcel status.",
    });
  }
};

// Customer/Admin: Cancel parcel
export const cancelParcel = async (req, res) => {
  try {
    const parcel = await Parcel.findById(req.params.id);

    if (!parcel) {
      return res.status(404).json({
        success: false,
        message: "Parcel not found.",
      });
    }

    // Customer can only cancel their own pending parcel; Admin can cancel anything unfinished
    const isOwner = idEquals(parcel.customer, req.user._id);
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only cancel your own parcels.",
      });
    }

    if (["Delivered", "Cancelled"].includes(parcel.status)) {
      return res.status(400).json({
        success: false,
        message: `This parcel is already ${parcel.status.toLowerCase()}.`,
      });
    }

    if (!isAdmin && !BEFORE_PICKUP.includes(parcel.status)) {
      return res.status(400).json({
        success: false,
        message: "Parcels can only be cancelled before the driver picks them up.",
      });
    }

    parcel.status = "Cancelled";
    await parcel.save();

    return res.status(200).json({
      success: true,
      message: "Parcel cancelled successfully.",
      data: parcel,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({ success: false, message: "Parcel not found." });
    }
    console.error("Cancel Parcel Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to cancel parcel.",
    });
  }
};

// Admin: System statistics overview
export const getAdminStats = async (req, res) => {
  try {
    const [statusCounts, totalDrivers, activeDrivers, totalCustomers, revenueResult] =
      await Promise.all([
        Parcel.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        User.countDocuments({ role: "driver" }),
        User.countDocuments({ role: "driver", isAvailable: true }),
        User.countDocuments({ role: "customer" }),
        Parcel.aggregate([
          { $match: { status: { $ne: "Cancelled" } } },
          { $group: { _id: null, totalRevenue: { $sum: "$price" } } },
        ]),
      ]);

    const byStatus = Object.fromEntries(statusCounts.map((s) => [s._id, s.count]));
    const totalParcels = statusCounts.reduce((sum, s) => sum + s.count, 0);

    return res.status(200).json({
      success: true,
      stats: {
        totalParcels,
        pendingParcels: byStatus.Pending || 0,
        assignedParcels: byStatus.Assigned || 0,
        pickedUpParcels: byStatus["Picked Up"] || 0,
        inTransitParcels: byStatus["In Transit"] || 0,
        deliveredParcels: byStatus.Delivered || 0,
        cancelledParcels: byStatus.Cancelled || 0,
        totalDrivers,
        activeDrivers,
        totalCustomers,
        totalRevenue: revenueResult[0]?.totalRevenue || 0,
      },
    });
  } catch (error) {
    console.error("Get Admin Stats Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve statistics.",
    });
  }
};

// Shared handler for the two parcel image slots
const saveParcelImage = (field, canUpload) => async (req, res) => {
  try {
    const parcel = await Parcel.findById(req.params.id);
    if (!parcel) {
      await removeStoredImage(req.uploadedImage);
      return res.status(404).json({ success: false, message: "Parcel not found." });
    }

    const denied = canUpload(parcel, req.user);
    if (denied) {
      await removeStoredImage(req.uploadedImage);
      return res.status(denied.status).json({ success: false, message: denied.message });
    }

    const previous = parcel[field];
    parcel[field] = req.uploadedImage;
    await parcel.save();
    await removeStoredImage(previous);

    const updated = await populateParcel(Parcel.findById(parcel._id));
    return res.status(200).json({ success: true, message: "Photo saved.", data: updated });
  } catch (error) {
    await removeStoredImage(req.uploadedImage);
    if (error.name === "CastError") {
      return res.status(404).json({ success: false, message: "Parcel not found." });
    }
    console.error(`Save parcel ${field} error:`, error);
    return res.status(500).json({ success: false, message: "Failed to save photo." });
  }
};

// Customer: photo of the package, until the driver picks it up
export const uploadParcelPhoto = saveParcelImage("photo", (parcel, user) => {
  if (!idEquals(parcel.customer, user._id)) {
    return { status: 404, message: "Parcel not found." };
  }
  if (!BEFORE_PICKUP.includes(parcel.status)) {
    return { status: 400, message: "The package photo can only be changed before pickup." };
  }
  return null;
});

// Driver (assigned) / Admin: proof-of-delivery photo once the parcel is collected
export const uploadDeliveryPhoto = saveParcelImage("deliveryPhoto", (parcel, user) => {
  const isAdmin = user.role === "admin";
  if (!isAdmin && !idEquals(parcel.driver, user._id)) {
    return { status: 403, message: "Only the assigned driver can add proof of delivery." };
  }
  if (!["Picked Up", "In Transit", "Delivered"].includes(parcel.status)) {
    return { status: 400, message: "Proof of delivery can be added once the parcel is picked up." };
  }
  return null;
});
