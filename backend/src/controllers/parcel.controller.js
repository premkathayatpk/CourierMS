import Parcel from "../models/Parcel.js";
import User from "../models/User.js";
import calculatePrice from "../utils/calculatePrice.js";
import genTrackingNum from "../utils/genTrackingNum.js";

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
      !pickupContact ||
      !pickupLocation ||
      !deliveryContact ||
      !deliveryLocation ||
      !weight
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields.",
      });
    }

    let trackingNumber;

    do {
      trackingNumber = genTrackingNum();
    } while (await Parcel.exists({ trackingNumber }));

    const price = calculatePrice({ weight, parcelType });

    const parcel = await Parcel.create({
      trackingNumber,
      customer: req.user._id,
      pickupContact,
      pickupLocation,
      deliveryContact,
      deliveryLocation,
      parcelType,
      weight,
      notes,
    });

    return res.status(201).json({
      success: true,
      message: "Parcel booked successfully.",
      data: parcel,
    });
  } catch (error) {
    console.error("Create Parcel:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

//get my parcel

export const getMyParcel = async (req, res) => {
  try {
    const parcel = await Parcel.find({
      customer: req.user._id,
    })
      .populate("driver", "name phone ")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: parcel.length,
      data: parcel,
    });
  } catch (error) {
    console.error("Get My Parcel:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

//get all parcels
export const getAllParcel = async (req, res) => {
  try {
    const parcel = await Parcel.find()
      .populate("driver", "name phone ")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: parcel.length,
      data: parcel,
    });
  } catch (error) {
    console.error("Get All Parcel:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// get parcel by tracking num
export const trackParcel = async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    const parcel = await Parcel.findOne({
      trackParcel,
    })
      .populate("customer", "name email phone")
      .populate("driver", "name phone ");

    if (!parcel) {
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
    console.error("Parcel tracking error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

// assign driver parcel
export const updateParcel = async (req, res) => {
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

    if (["Delivered", "Cancelled"].includes(parcel.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot assign driver to a ${parcel.status.toLowerCase()} parcel.`,
      });
    }

    if (parcel.driver) {
      return res.status(400).json({
        success: false,
        message: "Driver is already assigned to this parcel.",
      });
    }

    const driver = await User.findOne({
      _id: driverId,
      role: "driver",
    });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found or inactive.",
      });
    }

    parcel.driver = driver._id;
    parcel.status = "Assigned";

    await parcel.save();

    const assignedParcel = await Parcel.findById(parcel._id)
      .populate("customer", "name email phone")
      .populate("driver", "name phone ");

    return res.status(200).json({
      success: true,
      message: "Driver assigned successfully.",
      data: assignedParcel,
    });
  } catch (error) {
    console.error(" assign driver error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

//update parcel status

export const updateParcelStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required.",
      });
    }

    const parcel = await Parcel.findById(id);

    if (!parcel) {
      return res.status(404).json({
        success: false,
        message: "Parcel not found.",
      });
    }

    if (
      !parcel.driver ||
      parcel.driver.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. You are not the driver assigned to this parcel.",
      });
    }

    const expectedStatus = statusFlow[parcel.status];

    if (status !== expectedStatus) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition. Next allowed status is "${expectedStatus}".`,
      });
    }

    parcel.status = status;

    if (status === "Picked Up") {
      parcel.pickedUpAt = new Date();
    }
    if (status === "Delivered") {
      parcel.deliveredAt = new Date();
    }

    await parcel.save();

    const updatedParcel = await Parcel.findById(parcel._id)
      .populate("customer", "name phone")
      .populate("driver", "name phone");

    return res.status(200).json({
      success: true,
      message: "Parcel status updated successfully.",
      data: updatedParcel,
    });
  } catch (error) {
    console.error("  Update parcel status error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

//cancle parcel
export const cancelParcel = async (req, res) => {
  try {
    const parcel = await Parcel.findOne({
      _id: req.params.id,
      customer: req.user._id,
    });

    if (!parcel) {
      return res.status(404).json({
        success: false,
        message: "Parcel not found.",
      });
    }

    if (parcel.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending parcels can be cancelled.",
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
    console.error("Cancel Parcel Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
