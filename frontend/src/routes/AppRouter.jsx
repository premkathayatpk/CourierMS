import React from "react";
import { Route, Routes } from "react-router-dom";
import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";

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
    </Routes>
  );
};

export default AppRouter;
