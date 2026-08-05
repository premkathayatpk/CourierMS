import React from "react";
import { Link } from "react-router-dom";

const Sidebar = () => {
  return (
    <div className="w-50 h-screen bg-gray-700 p-4 flex flex-col gap-4 text-white">
      <Link to="/customer">Dashboard</Link>
      <Link to="/customer/parcels">Parcels</Link>
      <Link to="/customer/parcel/:id">Parcel detail</Link>
      <Link to="/customer/profile">Profile</Link>
    </div>
  );
};

export default Sidebar;
