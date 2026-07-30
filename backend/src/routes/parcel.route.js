import express from "express";
import { createParcel } from "../controllers/parcel.controller.js";

const parcelRouter = express.Router();

parcelRouter.post("/create", createParcel);

export default parcelRouter;
