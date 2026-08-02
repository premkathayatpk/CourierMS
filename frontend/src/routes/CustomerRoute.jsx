import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { Outlet, useNavigate } from "react-router-dom";

const CustomerRoute = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser && currentUser.role === "customer") {
      return navigate("/customer", { replace: true });
    }
  }, [currentUser, navigate]);
  if (!currentUser) {
    return <div>Please log in to access this page.</div>;
  }

  if (currentUser.role !== "customer") {
    return <div>Access Denied. Customers only.</div>;
  }

  return <Outlet />;
};

export default CustomerRoute;
