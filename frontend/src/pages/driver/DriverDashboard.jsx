import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { apiFetch } from "../../services/api";

import {
  Truck,
  Package,
  CheckCircle2,
  Navigation,
  Clock,
  MapPin,
  ArrowRight,
} from "lucide-react";

const DriverDashboard = () => {
  const { user } = useSelector((state) => state.user);

  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchDriverParcels = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/parcel/driverParcels");
      if (res.success) {
        setParcels(res.data || []);
      }
    } catch (err) {
      console.error("Error fetching driver parcels", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverParcels();
  }, []);

  // Update status transition
  const handleUpdateStatus = async (parcelId, nextStatus) => {
    setUpdatingId(parcelId);
    try {
      const res = await apiFetch(`/parcel/status/${parcelId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.success) {
        setParcels((prev) =>
          prev.map((p) =>
            p._id === parcelId ? { ...p, status: nextStatus } : p,
          ),
        );
      }
    } catch (err) {
      alert(err.message || "Failed to update parcel status");
    } finally {
      setUpdatingId(null);
    }
  };

  // Find active in-progress delivery
  const activeDelivery = parcels.find((p) =>
    ["Assigned", "Picked Up", "In Transit"].includes(p.status),
  );

  const completed = parcels.filter((p) => p.status === "Delivered").length;
  const pendingPickup = parcels.filter((p) => p.status === "Assigned").length;
  const inTransitCount = parcels.filter((p) =>
    ["Picked Up", "In Transit"].includes(p.status),
  ).length;

  return (
    <div className="space-y-8">
      {/* Top Welcome Card */}
      <div className="flex flex-col items-start justify-between gap-5 border-b border-ink-200 pb-6 md:flex-row md:items-center">
        <div>
          <span className="mb-2 inline-block text-xs font-bold uppercase text-brand-700">
            Driver dashboard
          </span>
          <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">
            Welcome back, {user?.name || "Driver"}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {user?.vehicleType || "Bike"} · License{" "}
            {user?.licenseNumber || "N/A"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/driver/navigation"
            className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
          >
            <Navigation className="w-4 h-4" /> Open Live Map Route
          </Link>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-ink-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
              Active Shipments
            </p>
            <h3 className="text-2xl sm:text-3xl font-black text-brand-600">
              {loading ? "..." : inTransitCount}
            </h3>
            <span className="text-[11px] text-ink-400">On the road</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-ink-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
              Pending Pickup
            </p>
            <h3 className="text-2xl sm:text-3xl font-black text-amber-600">
              {loading ? "..." : pendingPickup}
            </h3>
            <span className="text-[11px] text-ink-400">To be collected</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-ink-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
              Completed
            </p>
            <h3 className="text-2xl sm:text-3xl font-black text-emerald-600">
              {loading ? "..." : completed}
            </h3>
            <span className="text-[11px] text-ink-400">
              Successfully delivered
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-ink-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
              Total Assigned
            </p>
            <h3 className="text-2xl sm:text-3xl font-black text-ink-900">
              {loading ? "..." : parcels.length}
            </h3>
            <span className="text-[11px] text-ink-400">Lifetime parcels</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-ink-50 text-ink-600 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Active High-Priority Shipment Card */}
      {activeDelivery && (
        <div className="bg-white rounded-3xl border-2 border-brand-500 shadow-lg p-6 sm:p-7 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-ink-100">
            <div>
              <span className="bg-brand-600 text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full tracking-wider">
                Current Active Task
              </span>
              <h2 className="text-xl font-black text-ink-900 mt-1 flex items-center gap-2">
                {activeDelivery.parcelType} • {activeDelivery.weight} kg
                <span className="text-xs font-mono font-normal text-ink-400">
                  ({activeDelivery.trackingNumber})
                </span>
              </h2>
            </div>

            <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
              Status: {activeDelivery.status}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 mb-6">
            <div className="bg-ink-50 p-4 rounded-2xl border border-ink-200 space-y-2">
              <span className="text-[11px] font-bold text-emerald-700 uppercase flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> 1. Pickup Origin
              </span>
              <p className="font-bold text-ink-800 text-sm">
                {activeDelivery.pickupContact?.name} (
                {activeDelivery.pickupContact?.phone})
              </p>
              <p className="text-xs text-ink-600">
                {activeDelivery.pickupLocation?.address}
              </p>
            </div>

            <div className="bg-ink-50 p-4 rounded-2xl border border-ink-200 space-y-2">
              <span className="text-[11px] font-bold text-rose-700 uppercase flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> 2. Delivery Destination
              </span>
              <p className="font-bold text-ink-800 text-sm">
                {activeDelivery.deliveryContact?.name} (
                {activeDelivery.deliveryContact?.phone})
              </p>
              <p className="text-xs text-ink-600">
                {activeDelivery.deliveryLocation?.address}
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-ink-100">
            <Link
              to={`/driver/navigation?parcel=${activeDelivery._id}`}
              className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              Open live route <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <div className="flex items-center gap-2">
              {activeDelivery.status === "Assigned" && (
                <button
                  onClick={() =>
                    handleUpdateStatus(activeDelivery._id, "Picked Up")
                  }
                  disabled={updatingId === activeDelivery._id}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md transition"
                >
                  Confirm Pickup From Sender
                </button>
              )}

              {activeDelivery.status === "Picked Up" && (
                <button
                  onClick={() =>
                    handleUpdateStatus(activeDelivery._id, "In Transit")
                  }
                  disabled={updatingId === activeDelivery._id}
                  className="bg-brand-600 hover:bg-brand-500 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md transition"
                >
                  Start Transit To Recipient
                </button>
              )}

              {activeDelivery.status === "In Transit" && (
                <button
                  onClick={() =>
                    handleUpdateStatus(activeDelivery._id, "Delivered")
                  }
                  disabled={updatingId === activeDelivery._id}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-md transition"
                >
                  Mark as Delivered
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assigned Shipments Table */}
      <div className="bg-white rounded-2xl border border-ink-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-ink-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink-900">
              Assigned Deliveries
            </h2>
            <p className="text-xs text-ink-500">
              Parcels assigned to your courier vehicle
            </p>
          </div>
          <Link
            to="/driver/parcels"
            className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            Manage All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-ink-400 text-sm">
            Loading tasks...
          </div>
        ) : parcels.length === 0 ? (
          <div className="p-12 text-center text-ink-400 text-sm">
            No deliveries assigned to you yet. Stay online to receive dispatch
            orders!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-ink-700">
              <thead className="bg-ink-50 text-xs font-bold uppercase tracking-wider text-ink-500 border-b border-ink-200">
                <tr>
                  <th className="py-3 px-4">Tracking #</th>
                  <th className="py-3 px-4">Type & Weight</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {parcels.slice(0, 6).map((p) => (
                  <tr key={p._id} className="hover:bg-ink-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-600 text-xs">
                      {p.trackingNumber}
                    </td>
                    <td className="py-3.5 px-4 font-medium">
                      {p.parcelType} ({p.weight} kg)
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-ink-800">
                        {p.deliveryContact?.name}
                      </p>
                      <p className="text-xs text-ink-400">
                        {p.deliveryContact?.phone}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-xs text-ink-600">
                      {p.deliveryLocation?.address}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-ink-100 text-ink-800 border border-ink-200">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/customer/parcel/${p._id}`}
                        className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-xs font-semibold transition"
                      >
                        Map Route
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverDashboard;
