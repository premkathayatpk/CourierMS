import React from "react";
import Dashboard from "../pages/customer/dashboard";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/customer/Sidebar";
import Navbar from "../components/customer/Navbar";

const CustomerLayout = () => {
  return (
    <div>
      <div>
        <Navbar />
      </div>
      <div className="flex">
        <Sidebar />
        <Outlet />
      </div>
    </div>
  );
};

export default CustomerLayout;
