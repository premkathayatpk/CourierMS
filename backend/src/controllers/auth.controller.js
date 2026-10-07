import User from "../models/User.js";
import bcrypt from "bcrypt";
import tokenGen from "../utils/tokenGen.js";
import jwt from "jsonwebtoken";

const isProduction = process.env.NODE_ENV === "production";

// Frontend and API on different sites (production) need SameSite=None + Secure
// for the auth cookie to be sent on cross-site fetches.
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// Only these roles can be chosen at sign-up. Admins are created by the seed
// script (or directly in the DB), never through the public API.
const SELF_REGISTER_ROLES = ["customer", "driver"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

const toSafeUser = (user) => ({
  _id: user._id,
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  vehicleType: user.vehicleType,
  licenseNumber: user.licenseNumber,
  isAvailable: user.isAvailable,
  currentLocation: user.currentLocation,
  avatar: user.avatar,
});

export const register = async (req, res) => {
  try {
    const { name, email, password, phone, role, vehicleType, licenseNumber } =
      req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ success: false, message: "Name, email, password and phone are required." });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: "Please provide a valid email address." });
    }

    if (String(password).length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      });
    }

    const userRole = role || "customer";
    if (!SELF_REGISTER_ROLES.includes(userRole)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${SELF_REGISTER_ROLES.join(", ")}.`,
      });
    }

    const existEmail = await User.findOne({ email: normalizedEmail });
    if (existEmail) {
      return res.status(400).json({ success: false, message: "Email is already registered." });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);

    const userData = {
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: String(phone).trim(),
      role: userRole,
    };

    if (userRole === "driver") {
      userData.vehicleType = vehicleType || "Bike";
      userData.licenseNumber = licenseNumber ? String(licenseNumber).trim() : "";
      userData.isAvailable = true;
      // No location until the driver starts broadcasting GPS
      userData.currentLocation = { latitude: null, longitude: null };
    }

    const user = await User.create(userData);

    res.cookie("token", tokenGen(user), cookieOptions);

    return res.status(201).json({
      success: true,
      message: "User registered successfully.",
      user: toSafeUser(user),
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("Register Error:", error);
    return res.status(500).json({ success: false, message: "Registration failed." });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }
    const normalizedEmail = String(email).toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });

    const isPasswordValid =
      user && (await bcrypt.compare(String(password), user.password));

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    res.cookie("token", tokenGen(user), cookieOptions);

    return res.status(200).json({
      success: true,
      message: "Logged in successfully.",
      user: toSafeUser(user),
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ success: false, message: "Login failed." });
  }
};

export const logout = async (req, res) => {
  // clearCookie must not carry maxAge, otherwise the cookie is re-set instead of removed
  // eslint-disable-next-line no-unused-vars
  const { maxAge, ...clearOptions } = cookieOptions;
  res.clearCookie("token", clearOptions);
  return res.status(200).json({ success: true, message: "Logged out successfully." });
};

// Session check for app start-up: always 200, with user: null when logged out,
// so a signed-out visitor doesn't produce a 401 in the browser console.
export const getSession = async (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.status(200).json({ success: true, user: null });
  try {
    const { userId } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(userId).select("-password");
    return res.status(200).json({ success: true, user: user || null });
  } catch {
    return res.status(200).json({ success: true, user: null }); // expired or invalid token
  }
};
