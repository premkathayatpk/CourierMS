import React from "react";
import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
  const location = useLocation();

  const linkClass = (path) =>
    `px-4 py-2 rounded-lg transition duration-200 ${
      location.pathname === path
        ? "bg-white text-blue-700 font-semibold"
        : "text-white hover:bg-white/20"
    }`;

  return (
    <header className="bg-black shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link to="/" className="text-2xl font-bold text-white tracking-wide">
          CourierMS
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-3">
          <Link to="/" className={linkClass("/")}>
            Home
          </Link>

          <Link to="/login" className={linkClass("/login")}>
            Login
          </Link>

          <Link to="/register" className={linkClass("/register")}>
            Register
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
