import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { clearUser } from "../../redux/slice/userSlice";
import { apiFetch } from "../../services/api";
import Avatar from "./Avatar";
import {
  Package,
  LogOut,
  Compass,
  LayoutDashboard,
} from "lucide-react";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);

  const handleLogout = async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout error", e);
    } finally {
      dispatch(clearUser());
      navigate("/login");
    }
  };

  const isActive = (path) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname === path || location.pathname.startsWith(`${path}/`);

  const linkClass = (path) =>
    `px-3 py-2 rounded-lg text-sm font-semibold transition duration-200 flex items-center gap-1.5 ${
      isActive(path)
        ? "bg-brand-50 text-brand-700"
        : "text-ink-600 hover:text-ink-900 hover:bg-ink-100"
    }`;

  const getDashboardPath = () => {
    if (!user) return "/login";
    switch (user.role) {
      case "admin":
        return "/admin";
      case "driver":
        return "/driver";
      case "customer":
      default:
        return "/customer";
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/90 text-ink-900 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-3 sm:px-6">
        {/* Brand Logo */}
        <Link to="/" className="group flex min-w-0 items-center gap-2 sm:gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 bg-brand-600 shadow-sm shadow-brand-600/30 transition group-hover:bg-brand-700">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-base font-extrabold leading-none text-ink-900 sm:text-xl">
              CourierMS
            </span>
            <span className="hidden text-[10px] font-bold uppercase text-ink-500 sm:block">
              Delivery management
            </span>
          </div>
        </Link>

        {/* Navigation links */}
        <nav className="flex shrink-0 items-center gap-0.5 sm:gap-2">
          <Link to="/" className={`${linkClass("/")} hidden sm:flex`}>
            Home
          </Link>

          <Link to="/track" className={linkClass("/track")}>
            <Compass className="h-4 w-4" />
            <span className="hidden sm:inline">Track Live</span>
          </Link>

          {user ? (
            <>
              <Link
                to={getDashboardPath()}
                className={linkClass(getDashboardPath())}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden capitalize sm:inline">
                  {user.role} Portal
                </span>
              </Link>

              {/* User Dropdown / Badge */}
              <div className="flex items-center gap-2 border-l border-ink-200 pl-2 sm:gap-3 sm:pl-4">
                <div className="flex items-center gap-2">
                  <Link to={`${getDashboardPath()}/profile`} aria-label="My profile">
                    <Avatar user={user} size="sm" />
                  </Link>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-semibold leading-tight text-ink-900">
                      {user.name}
                    </p>
                    <span className="inline-block rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink-600">
                      {user.role}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  title="Logout"
                  aria-label="Log out"
                  className="rounded-lg p-2 text-ink-500 transition hover:bg-rose-50 hover:text-rose-700"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2">
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 text-xs font-semibold text-ink-600 transition hover:bg-ink-100 hover:text-ink-900 sm:text-sm"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700 sm:px-4 sm:text-sm"
              >
                Get Started
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
