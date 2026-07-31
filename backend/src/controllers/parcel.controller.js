import Parcel from "../models/Parcel.js";
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
