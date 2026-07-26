import express from "express";
import authRouter from "./routes/auth.route.js";
// import cors from "cor";
const app = express();

//middleware
app.use(express.json());

//APIs
app.use("/api/auth", authRouter);

export default app;
