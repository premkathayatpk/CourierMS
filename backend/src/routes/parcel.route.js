import express from "express";
import {
  cancelParcel,
  createParcel,
  getAllParcel,
  getMyParcel,
  updateParcel,
} from "../controllers/parcel.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import authorize from "../middleware/role.middleware.js";

const parcelRouter = express.Router();

parcelRouter.post("/create", protect, authorize("customer"), createParcel);

parcelRouter.get("/myParcel", protect, authorize("customer"), getMyParcel);

parcelRouter.get("/allParcel", protect, authorize("admin"), getAllParcel);

parcelRouter.patch(
  "/updateStatus/:id",
  protect,
  authorize("driver"),
  updateParcel,
);

parcelRouter.patch("/cancle/:id", protect, authorize("customer"), cancelParcel);

export default parcelRouter;
