import React from "react";
import { Route, Routes } from "react-router-dom";
import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";
import Dashboard from "../pages/customer/dashboard";
import CreateParcel from "../pages/customer/CreateParcel";
import Parcel from "../pages/customer/Parcel";
import ParcelDetails from "../pages/customer/ParcelDetails";
import TrackParcel from "../pages/customer/TrackParcel";

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />}>
        Home
      </Route>
      <Route path="/login" element={<Login />}>
        Login
      </Route>
      <Route path="/register" element={<Register />}>
        Register
      </Route>

      <Route >
        <Route path="/customer" element={<Dashboard />} />
        <Route path="/createParcel" element={<CreateParcel />} />
        <Route path="/parcel" element={<Parcel />} />
        <Route path="/parcelDetail" element={<ParcelDetails />} />
        <Route path="/trackParcel" element={<TrackParcel />} />
      </Route>
    </Routes>
  );
};

export default AppRouter;
