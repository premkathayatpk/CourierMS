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
import CustomerRoute from "./CustomerRoute";
import CustomerLayout from "../layouts/CustomerLayout";

const AppRouter = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />}></Route>
      <Route path="/login" element={<Login />}></Route>
      <Route path="/register" element={<Register />}></Route>

      <Route element={<CustomerRoute />}>
        <Route path="/customer" element={<CustomerLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="createParcel" element={<CreateParcel />} />
          <Route path="parcel" element={<Parcel />} />
          <Route path="parcel/:id" element={<ParcelDetails />} />
          <Route path="track/:id" element={<TrackParcel />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default AppRouter;
