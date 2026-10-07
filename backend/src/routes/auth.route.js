import express from "express";
import { getSession, login, logout, register } from "../controllers/auth.controller.js";
import rateLimit from "../middleware/rateLimit.middleware.js";

const authRouter = express.Router();

// Slow down password guessing and sign-up spam
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many attempts. Please try again in a few minutes.",
});

authRouter.post("/register", authLimiter, register);
authRouter.post("/login", authLimiter, login);
authRouter.post("/logout", logout);
authRouter.get("/session", getSession);

export default authRouter;
