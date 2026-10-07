import React from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Truck,
  Users,
  ShieldCheck,
  Settings,
} from "lucide-react";

const AdminLayout = () => {
  const location = useLocation();

  const links = [
    { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
    { to: "/admin/parcels", label: "Parcel Dispatch", icon: Package },
    { to: "/admin/drivers", label: "Drivers Fleet", icon: Truck },
    { to: "/admin/users", label: "Users & Customers", icon: Users },
    { to: "/admin/profile", label: "Admin Profile", icon: Settings },
  ];

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  };

  return (
    <div className="flex min-h-[calc(100vh-65px)] flex-col bg-ink-50 lg:flex-row">
      {/* Admin Sidebar */}
      <aside className="z-20 w-full shrink-0 border-b border-ink-200 bg-white lg:sticky lg:top-[65px] lg:h-[calc(100vh-65px)] lg:w-60 lg:self-start lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-3 py-2 lg:px-4 lg:py-4">
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-ink-600">
            <ShieldCheck className="h-4 w-4 text-brand-600" /> Operations
          </span>
          <span className="rounded-md bg-accent-50 px-2 py-1 text-[10px] font-bold text-accent-700">
            Admin
          </span>
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

      {/* Main Admin View */}
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
