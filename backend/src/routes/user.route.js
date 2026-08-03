import express from "express";
import { getCurrentUser } from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const userRouter = express.Router();

userRouter.get("/me", protect, getCurrentUser);

export default userRouter;
