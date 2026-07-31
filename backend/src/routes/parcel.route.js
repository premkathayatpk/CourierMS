import express from "express";
import { createParcel, getMyParcel } from "../controllers/parcel.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import authorize from "../middleware/role.middleware.js";

const parcelRouter = express.Router();

parcelRouter.post("/create", protect, authorize("customer"), createParcel);
parcelRouter.get("/myParcel", protect, authorize("customer"), getMyParcel);

export default parcelRouter;
