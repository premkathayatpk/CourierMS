import express from "express";
import {
  assignDriver,
  cancelParcel,
  createParcel,
  getAdminStats,
  getAllParcel,
  getDriverParcels,
  getMyParcel,
  getParcelById,
  trackParcel,
  updateParcelStatus,
  uploadParcelPhoto,
  uploadDeliveryPhoto,
  getQuote,
} from "../controllers/parcel.controller.js";
import { imageUpload } from "../middleware/upload.middleware.js";
import { protect } from "../middleware/auth.middleware.js";
import authorize from "../middleware/role.middleware.js";

const parcelRouter = express.Router();

// Tracking (public so customers and recipients can track by tracking number)
parcelRouter.get("/track/:trackingNumber", trackParcel);

// Customer endpoints
parcelRouter.post("/quote", protect, authorize("customer"), getQuote);
parcelRouter.post("/create", protect, authorize("customer"), createParcel);
parcelRouter.get("/myParcel", protect, authorize("customer"), getMyParcel);
parcelRouter.patch("/cancel/:id", protect, authorize("customer", "admin"), cancelParcel);

parcelRouter.put("/:id/photo", protect, authorize("customer"), imageUpload("parcels"), uploadParcelPhoto);

// Driver endpoints
parcelRouter.get("/driverParcels", protect, authorize("driver"), getDriverParcels);
parcelRouter.patch(
  "/status/:id",
  protect,
  authorize("driver", "admin"),
  updateParcelStatus
);

parcelRouter.put(
  "/:id/delivery-photo",
  protect,
  authorize("driver", "admin"),
  imageUpload("deliveries"),
  uploadDeliveryPhoto
);

// Admin endpoints
parcelRouter.get("/allParcel", protect, authorize("admin"), getAllParcel);
parcelRouter.get("/stats", protect, authorize("admin"), getAdminStats);
parcelRouter.patch("/assign/:id", protect, authorize("admin"), assignDriver);

// General authenticated endpoint to get single parcel details
parcelRouter.get("/:id", protect, getParcelById);

export default parcelRouter;
