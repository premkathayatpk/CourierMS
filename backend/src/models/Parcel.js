import mongoose from "mongoose";

const parcelSchema = new mongoose.Schema(
  {
    trackingNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    pickupContact: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      phone: {
        type: String,
        required: true,
        trim: true,
      },
    },
    pickupLocation: {
      address: {
        type: String,
        required: true,
      },
      latitude: {
        type: Number,
        required: true,
      },
      longitude: {
        type: Number,
        required: true,
      },
    },
    deliveryContact: {
      name: {
        type: String,
        required: true,
        trim: true,
      },
      phone: {
        type: String,
        required: true,
        trim: true,
      },
    },
    deliveryLocation: {
      address: {
        type: String,
        required: true,
      },
      latitude: {
        type: Number,
        required: true,
      },
      longitude: {
        type: Number,
        required: true,
      },
    },
    parcelType: {
      type: String,
      enum: [
        "Document",
        "Electronics",
        "Clothes",
        "Food",
        "Fragile",
        "Medicine",
        "Other",
      ],
      default: "Other",
    },
    weight: {
      type: Number,
      required: true,
      min: 0.1,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    // Road distance (A*) and how the price was built, saved at booking time
    distanceKm: {
      type: Number,
      default: null,
    },
    priceBreakdown: {
      base: Number,
      distance: Number,
      weight: Number,
      surcharge: Number,
      minimumFareAdjustment: Number,
    },
    status: {
      type: String,
      enum: [
        "Pending",
        "Assigned",
        "Picked Up",
        "In Transit",
        "Delivered",
        "Cancelled",
      ],
      default: "Pending",
    },
    pickedUpAt: {
      type: Date,
    },

    deliveredAt: {
      type: Date,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    // Images stored locally under backend/uploads (relative URL paths)
    photo: {
      type: String, // package photo added by the customer while Pending
      default: "",
    },
    deliveryPhoto: {
      type: String, // proof of delivery taken by the driver
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

const Parcel = mongoose.model("Parcel", parcelSchema);

export default Parcel;
