import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/customer/Sidebar";

const CustomerLayout = () => {
  return (
    <div className="flex min-h-[calc(100vh-65px)] flex-col bg-ink-50 lg:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default CustomerLayout;
