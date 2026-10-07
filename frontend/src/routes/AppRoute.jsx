import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

// Public pages
import Home from "../pages/Home";
import Login from "../pages/Login";
import Register from "../pages/Register";

// Layouts
import CustomerLayout from "../layouts/CustomerLayout";
import DriverLayout from "../layouts/DriverLayout";
import AdminLayout from "../layouts/AdminLayout";

// Guards
import CustomerRoute from "./CustomerRoute";
import DriverRoute from "./DriverRoute";
import AdminRoute from "./AdminRoute";

// Shared
const Profile = lazy(() => import("../pages/Profile"));

// Customer pages
const TrackParcel = lazy(() => import("../pages/customer/TrackParcel"));
const CustomerDashboard = lazy(() => import("../pages/customer/Dashboard"));
const CreateParcel = lazy(() => import("../pages/customer/CreateParcel"));
const CustomerParcelsPage = lazy(() => import("../pages/customer/Parcel"));
const ParcelDetails = lazy(() => import("../pages/customer/ParcelDetails"));

// Driver pages
const DriverDashboard = lazy(() => import("../pages/driver/DriverDashboard"));
const DriverParcels = lazy(() => import("../pages/driver/DriverParcels"));
const DriverLiveDelivery = lazy(
  () => import("../pages/driver/DriverLiveDelivery"),
);

// Admin pages
const AdminDashboard = lazy(() => import("../pages/admin/AdminDashboard"));
const AdminParcels = lazy(() => import("../pages/admin/AdminParcels"));
const AdminDrivers = lazy(() => import("../pages/admin/AdminDrivers"));
const AdminUsers = lazy(() => import("../pages/admin/AdminUsers"));

const PageLoader = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-600 border-t-transparent"></div>
  </div>
);

const AppRouter = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Public Routes ── */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/track" element={<TrackParcel />} />
        <Route path="/track/:id" element={<TrackParcel />} />

        {/* ── Customer Protected Routes ── */}
        <Route element={<CustomerRoute />}>
          <Route path="/customer" element={<CustomerLayout />}>
            <Route index element={<CustomerDashboard />} />
            <Route path="createParcel" element={<CreateParcel />} />
            <Route path="parcels" element={<CustomerParcelsPage />} />
            <Route path="parcel/:id" element={<ParcelDetails />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Route>

        {/* ── Driver Protected Routes ── */}
        <Route element={<DriverRoute />}>
          <Route path="/driver" element={<DriverLayout />}>
            <Route index element={<DriverDashboard />} />
            <Route path="parcels" element={<DriverParcels />} />
            <Route path="navigation" element={<DriverLiveDelivery />} />
            <Route path="live" element={<DriverLiveDelivery />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Route>

        {/* ── Admin Protected Routes ── */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="parcels" element={<AdminParcels />} />
            <Route path="drivers" element={<AdminDrivers />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Route>

        {/* Fallback 404 */}
        <Route
          path="*"
          element={
            <div className="min-h-[70vh] flex flex-col items-center justify-center text-center">
              <h1 className="text-6xl font-black text-ink-200 mb-2">404</h1>
              <p className="text-ink-600 font-semibold text-lg mb-4">
                Page Not Found
              </p>
              <a
                href="/"
                className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition"
              >
                Return Home
              </a>
            </div>
          }
        />
      </Routes>
    </Suspense>
  );
};

export default AppRouter;
