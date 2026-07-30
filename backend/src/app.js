import express from "express";
import authRouter from "./routes/auth.route.js";
import cookieParse from "cookie-parser";
import cors from "cors";
import parcelRouter from "./routes/parcel.route.js";

const app = express();

//middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParse());

//APIs
app.use("/api/auth", authRouter);
app.use("/api/parcel", parcelRouter);

export default app;
