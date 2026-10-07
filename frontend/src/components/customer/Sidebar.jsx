import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  PlusCircle,
  Package,
  Compass,
  User,
} from "lucide-react";

const Sidebar = () => {
  const location = useLocation();

  const links = [
    { to: "/customer", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/customer/createParcel", label: "Book Parcel", icon: PlusCircle },
    { to: "/customer/parcels", label: "My Parcels", icon: Package },
    { to: "/track", label: "Live Tracking", icon: Compass },
    { to: "/customer/profile", label: "My Profile", icon: User },
  ];

  const isActive = (item) => {
    if (item.exact) {
      return location.pathname === item.to;
    }
    return location.pathname.startsWith(item.to);
  };

  return (
    <aside className="z-20 w-full shrink-0 border-b border-ink-200 bg-white lg:sticky lg:top-[65px] lg:h-[calc(100vh-65px)] lg:w-60 lg:self-start lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between px-3 py-2 lg:block lg:px-4 lg:py-4">
        <p className="text-[11px] font-bold uppercase text-ink-500">
          Customer Portal
        </p>
        <Link
          to="/customer/createParcel"
          className="rounded-md bg-brand-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-700 lg:hidden"
        >
          + Send package
        </Link>
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

      <div className="m-3 hidden rounded-md border border-ink-200 bg-ink-50 p-3 text-xs text-ink-600 lg:block">
        <p className="mb-1 font-semibold text-ink-900">Need help sending?</p>
        <p className="mb-2 text-[11px] text-ink-500">
          Deliver anywhere with real-time GPS tracking.
        </p>
        <Link
          to="/customer/createParcel"
          className="inline-block w-full rounded-md border border-brand-200 bg-brand-50 py-2 text-center text-xs font-semibold text-brand-700 transition hover:bg-brand-100"
        >
          + Send Package
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
