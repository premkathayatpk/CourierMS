import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { setUser } from "../redux/slice/userSlice";
import { apiFetch } from "../services/api";
import DriverGpsProvider from "../components/driver/DriverGpsProvider";
import useDriverGps from "../customeHook/useDriverGps";
import {
  LayoutDashboard,
  Truck,
  Navigation,
  User,
  Power,
  RadioTower,
} from "lucide-react";

const DriverLayout = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const isAvailable = user?.isAvailable !== false;

  const handleToggleAvailability = async () => {
    setIsUpdatingStatus(true);
    try {
      const data = await apiFetch("/user/driver/status", {
        method: "PATCH",
        body: JSON.stringify({ isAvailable: !isAvailable }),
      });
      if (data.driver) {
        dispatch(setUser({ ...user, ...data.driver }));
      }
    } catch (e) {
      console.error("Failed to toggle status:", e);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const links = [
    { to: "/driver", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/driver/parcels", label: "Assigned Tasks", icon: Truck },
    { to: "/driver/navigation", label: "Live Route Map", icon: Navigation },
    { to: "/driver/profile", label: "Driver Profile", icon: User },
  ];

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  };

  return (
    <DriverGpsProvider>
      <div className="flex min-h-[calc(100vh-65px)] flex-col bg-ink-50 lg:flex-row">
        {/* Driver Sidebar */}
        <aside className="z-20 w-full shrink-0 border-b border-ink-200 bg-white lg:sticky lg:top-[65px] lg:h-[calc(100vh-65px)] lg:w-60 lg:self-start lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3 px-3 py-2 lg:block lg:px-4 lg:py-4">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase text-ink-500">
                Driver Station
              </span>
              <p className="truncate text-sm font-bold text-ink-900">
                {user?.name}
              </p>
              <p className="hidden text-xs text-ink-500 lg:block">
                {user?.vehicleType || "Bike"} ·{" "}
                {user?.licenseNumber || "Standard"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <GpsIndicator />
              <span
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold ${
                  isAvailable
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${isAvailable ? "bg-emerald-700" : "bg-rose-700"}`}
                />
                {isAvailable ? "Online" : "Offline"}
              </span>
              <button
                onClick={handleToggleAvailability}
                disabled={isUpdatingStatus}
                className={`rounded-md px-3 py-2 text-xs font-semibold transition disabled:cursor-wait disabled:opacity-60 ${
                  isAvailable
                    ? "border border-rose-200 bg-white text-rose-700 hover:bg-rose-50"
                    : "bg-emerald-700 text-white hover:bg-emerald-800"
                }`}
              >
                <Power className="mr-1 inline h-3.5 w-3.5" />
                {isUpdatingStatus
                  ? "Updating..."
                  : isAvailable
                    ? "Go Offline"
                    : "Go Online"}
              </button>
            </div>
          </div>
  
          <nav className="flex gap-1 overflow-x-auto px-2 pb-2 lg:flex-col lg:px-3">
            {links.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex min-w-max items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-brand-50 text-brand-700 lg:shadow-[inset_3px_0_0_var(--color-brand-500)]"
                      : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
  
        {/* Main Content */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </DriverGpsProvider>
  );
};

// Small "GPS on/off" chip; dispatch only auto-assigns drivers who share location
const GpsIndicator = () => {
  const { sharing, position, gpsError } = useDriverGps();
  const live = sharing && position;
  return (
    <span
      title={gpsError || (live ? `Sharing location ±${position.accuracy} m` : sharing ? "Finding your location…" : "Location not shared")}
      className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold ${
        live ? "bg-emerald-50 text-emerald-700" : "bg-ink-100 text-ink-500"
      }`}
    >
      <RadioTower className="h-3 w-3" />
      {live ? "GPS" : sharing ? "GPS…" : "GPS off"}
    </span>
  );
};

export default DriverLayout;
