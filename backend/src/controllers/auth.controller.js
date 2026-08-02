import User from "../models/User.js";
import bcrypt from "bcrypt";
import tokenGen from "../utils/tokenGen.js";

export const register = async (req, res) => {
  try {
    const { name, email, password, phone, role, vehicleType, licenseNumber } =
      req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const normalizedEmail = email.toLowerCase();

    const existEmail = await User.findOne({ email: normalizedEmail });
    if (existEmail) {
      return res.status(400).json({ message: "Email already exist" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = {
      name,
      email: normalizedEmail,
      password: hashedPassword,
      phone,
      role: role || "customer",
    };

    if (role === "driver") {
      userData.vehicleType = vehicleType || "Bike";
      userData.licenseNumber = licenseNumber;
    }

    const user = await User.create(userData);

    const token = tokenGen(user);

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      success: true,
      message: "User registered successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        vehicleType: user.vehicleType,
      },
      token,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Register fail", error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const normalizedEmail = email.toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid Email or Password" });
    }

    const token = tokenGen(user);

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: "User logged in successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        vehicleType: user.vehicleType,
      },
      token,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Login fail", error: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });

    res.status(200).json({ success: true, message: "Logout success" });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Logout fail", error: error.message });
  }
};
