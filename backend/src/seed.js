import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "./models/User.js";
import Parcel from "./models/Parcel.js";
import genTrackingNum from "./utils/genTrackingNum.js";

dotenv.config();

const seedDatabase = async () => {
  try {
    console.log("Connecting to database for seeding...");
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Database connected successfully.");

    // Clear existing data (optional, or ensure demo accounts exist)
    const hashedPassword = await bcrypt.hash("password123", 10);

    // 1. Admin
    let admin = await User.findOne({ email: "admin@courierms.com" });
    if (!admin) {
      admin = await User.create({
        name: "Admin Officer",
        email: "admin@courierms.com",
        password: hashedPassword,
        phone: "9841112233",
        role: "admin",
      });
      console.log("Created Admin: admin@courierms.com / password123");
    }

    // 2. Drivers
    let driver1 = await User.findOne({ email: "driver1@courierms.com" });
    if (!driver1) {
      driver1 = await User.create({
        name: "Bikash Shrestha",
        email: "driver1@courierms.com",
        password: hashedPassword,
        phone: "9851023456",
        role: "driver",
        vehicleType: "Bike",
        licenseNumber: "BA-2-PA-8899",
        isAvailable: true,
        currentLocation: { latitude: 27.7125, longitude: 85.3180 }, // near Thamel
      });
      console.log("Created Driver 1: driver1@courierms.com / password123");
    }

    let driver2 = await User.findOne({ email: "driver2@courierms.com" });
    if (!driver2) {
      driver2 = await User.create({
        name: "Suman Maharjan",
        email: "driver2@courierms.com",
        password: hashedPassword,
        phone: "9841778899",
        role: "driver",
        vehicleType: "Van",
        licenseNumber: "BA-1-JA-4521",
        isAvailable: true,
        currentLocation: { latitude: 27.6750, longitude: 85.3200 }, // near Patan
      });
      console.log("Created Driver 2: driver2@courierms.com / password123");
    }

    // 3. Customer
    let customer = await User.findOne({ email: "customer@courierms.com" });
    if (!customer) {
      customer = await User.create({
        name: "Aayush Sharma",
        email: "customer@courierms.com",
        password: hashedPassword,
        phone: "9801234567",
        role: "customer",
      });
      console.log("Created Customer: customer@courierms.com / password123");
    }

    // 4. Sample Parcels
    const parcelCount = await Parcel.countDocuments();
    if (parcelCount < 3) {
      await Parcel.create([
        {
          trackingNumber: "TRK-DEMO-001",
          customer: customer._id,
          driver: driver1._id,
          pickupContact: { name: "Aayush Sharma", phone: "9801234567" },
          pickupLocation: {
            address: "Thamel Marg, Kathmandu",
            latitude: 27.7154,
            longitude: 85.3123,
          },
          deliveryContact: { name: "Rina KC", phone: "9841667788" },
          deliveryLocation: {
            address: "Pulchowk, Lalitpur",
            latitude: 27.6780,
            longitude: 85.3168,
          },
          parcelType: "Electronics",
          weight: 2.5,
          price: 275,
          status: "In Transit",
          notes: "Handle with care. Fragile laptop screen.",
          pickedUpAt: new Date(Date.now() - 3600000),
        },
        {
          trackingNumber: "TRK-DEMO-002",
          customer: customer._id,
          driver: driver2._id,
          pickupContact: { name: "Bipin Neupane", phone: "9812345678" },
          pickupLocation: {
            address: "New Baneshwor, Kathmandu",
            latitude: 27.6915,
            longitude: 85.3420,
          },
          deliveryContact: { name: "Sunil Karki", phone: "9861223344" },
          deliveryLocation: {
            address: "Kalanki Chowk, Kathmandu",
            latitude: 27.6934,
            longitude: 85.2818,
          },
          parcelType: "Document",
          weight: 0.5,
          price: 125,
          status: "Assigned",
          notes: "Urgent legal contract documents.",
        },
        {
          trackingNumber: "TRK-DEMO-003",
          customer: customer._id,
          driver: null,
          pickupContact: { name: "Aayush Sharma", phone: "9801234567" },
          pickupLocation: {
            address: "Maitighar Mandala, Kathmandu",
            latitude: 27.6938,
            longitude: 85.3230,
          },
          deliveryContact: { name: "Kiran Adhikari", phone: "9841998877" },
          deliveryLocation: {
            address: "Chabahil Stupa, Kathmandu",
            latitude: 27.7176,
            longitude: 85.3496,
          },
          parcelType: "Clothes",
          weight: 1.8,
          price: 190,
          status: "Pending",
          notes: "Package wrapped in plastic.",
        },
        {
          trackingNumber: "TRK-DEMO-004",
          customer: customer._id,
          driver: driver1._id,
          pickupContact: { name: "Aayush Sharma", phone: "9801234567" },
          pickupLocation: {
            address: "Lazimpat, Kathmandu",
            latitude: 27.7210,
            longitude: 85.3195,
          },
          deliveryContact: { name: "Geeta Thapa", phone: "9851122334" },
          deliveryLocation: {
            address: "Jhamsikhel, Lalitpur",
            latitude: 27.6740,
            longitude: 85.3080,
          },
          parcelType: "Medicine",
          weight: 1.0,
          price: 150,
          status: "Delivered",
          notes: "Delivered safely at front desk.",
          pickedUpAt: new Date(Date.now() - 7200000),
          deliveredAt: new Date(Date.now() - 1800000),
        },
      ]);
      console.log("Seeded sample parcels with live routes!");
    }

    console.log("Database seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
};

seedDatabase();
