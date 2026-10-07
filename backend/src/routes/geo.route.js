import express from "express";
import { getRoute, reverse, search, serviceArea } from "../controllers/geo.controller.js";
import rateLimit from "../middleware/rateLimit.middleware.js";

const geoRouter = express.Router();

// Public (the tracking page uses routing too), but rate limited per IP
const geoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: "Too many map requests. Please slow down.",
});

geoRouter.get("/route", geoLimiter, getRoute);
geoRouter.get("/search", geoLimiter, search);
geoRouter.get("/reverse", geoLimiter, reverse);
geoRouter.get("/service-area", serviceArea);

export default geoRouter;
