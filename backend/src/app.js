import express from "express";
import authRouter from "./routes/auth.route.js";
import cookieParse from "cookie-parser";
import cors from "cors";
import parcelRouter from "./routes/parcel.route.js";
import userRouter from "./routes/user.route.js";
import geoRouter from "./routes/geo.route.js";
import multer from "multer";
import { UPLOAD_ROOT, MAX_IMAGE_BYTES } from "./middleware/upload.middleware.js";

const app = express();

//middleware
app.use(
  cors({
    origin: (process.env.CLIENT_URL || "http://localhost:5173")
      .split(",")
      .map((url) => url.trim()),
    credentials: true,
  }),
);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParse());

// Locally stored images (file names are random UUIDs)
app.use(
  "/uploads",
  express.static(UPLOAD_ROOT, {
    maxAge: "30d",
    immutable: true, // a new upload always gets a new file name
    setHeaders: (res) => res.set("X-Content-Type-Options", "nosniff"),
  }),
);

//APIs
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/parcel", parcelRouter);
app.use("/api/geo", geoRouter);

// Unknown API route
app.use("/api", (req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// Central error handler (malformed JSON, invalid ObjectIds, unexpected errors)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? `Image is too large (max ${MAX_IMAGE_BYTES / 1024 / 1024} MB).`
        : 'Invalid upload. Send one image in the "image" field.';
    return res.status(400).json({ success: false, message });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Invalid JSON body." });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: `Invalid ${err.path}.` });
  }

  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.status ? err.message : "Internal server error.",
  });
});

export default app;
