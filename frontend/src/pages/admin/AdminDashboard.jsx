import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../services/api";
import { canTake, driverOptionLabel } from "../../utils/fleet";
import FleetMap from "../../components/common/FleetMap";
import {
  TrendingUp,
  Package,
  Truck,
  Clock,
  CheckCircle2,
  ArrowRight,
  UserCheck,
} from "lucide-react";

// Suggest the online driver (able to carry it) with the fewest active jobs
const bestDriverId = (drivers, parcel) =>
  [...drivers]
    .filter((d) => canTake(d, parcel))
    .sort((a, b) => (a.activeParcels || 0) - (b.activeParcels || 0))[0]?._id || "";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [pendingParcels, setPendingParcels] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Assign Driver Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [assigning, setAssigning] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, parcelsRes, driversRes] = await Promise.all([
        apiFetch("/parcel/stats"),
        apiFetch("/parcel/allParcel"),
        apiFetch("/user/active-drivers"),
      ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (parcelsRes.success) {
        setPendingParcels(
          parcelsRes.data.filter((p) => p.status === "Pending"),
        );
      }
      if (driversRes.success) setDrivers(driversRes.drivers || []);
    } catch (err) {
      console.error("Admin dashboard fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Keep the fleet map fresh while the dashboard is open
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") fetchDashboardData();
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleOpenAssign = (parcel) => {
    setSelectedParcel(parcel);
    setSelectedDriverId(bestDriverId(drivers, parcel));
    setAssignModalOpen(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedParcel || !selectedDriverId) return;

    setAssigning(true);
    try {
      const res = await apiFetch(`/parcel/assign/${selectedParcel._id}`, {
        method: "PATCH",
        body: JSON.stringify({ driverId: selectedDriverId }),
      });
      if (res.success) {
        alert("Driver assigned successfully!");
        setAssignModalOpen(false);
        fetchDashboardData();
      }
    } catch (err) {
      alert(err.message || "Failed to assign driver");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="flex flex-col items-start justify-between gap-5 border-b border-ink-200 pb-6 md:flex-row md:items-center">
        <div>
          <span className="mb-2 inline-block text-xs font-bold uppercase text-accent-700">
            Operations overview
          </span>
          <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">
            Dispatch dashboard
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Review the queue, assign drivers, and monitor fleet activity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/parcels"
            className="rounded-md border border-ink-300 px-4 py-2.5 text-sm font-semibold text-ink-600 transition hover:bg-white"
          >
            Dispatch Desk
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-ink-200 shadow-sm flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
              Total Revenue
            </p>
            <h3 className="whitespace-nowrap text-xl sm:text-3xl font-black text-ink-900">
              {loading ? "..." : `Rs. ${stats?.totalRevenue || 0}`}
            </h3>
            <span className="text-[11px] text-emerald-600 font-bold">
              Courier billings
            </span>
          </div>
          <div className="hidden sm:flex w-12 h-12 shrink-0 rounded-xl bg-emerald-50 text-emerald-600 items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-ink-200 shadow-sm flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
              Total Parcels
            </p>
            <h3 className="whitespace-nowrap text-xl sm:text-3xl font-black text-brand-600">
              {loading ? "..." : stats?.totalParcels || 0}
            </h3>
            <span className="text-[11px] text-ink-400">
              Total orders handled
            </span>
          </div>
          <div className="hidden sm:flex w-12 h-12 shrink-0 rounded-xl bg-brand-50 text-brand-600 items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-ink-200 shadow-sm flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
              Active Couriers
            </p>
            <h3 className="whitespace-nowrap text-xl sm:text-3xl font-black text-violet-600">
              {loading
                ? "..."
                : `${stats?.activeDrivers || 0} / ${stats?.totalDrivers || 0}`}
            </h3>
            <span className="text-[11px] text-violet-500 font-medium">
              Ready on road
            </span>
          </div>
          <div className="hidden sm:flex w-12 h-12 shrink-0 rounded-xl bg-violet-50 text-violet-600 items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-ink-200 shadow-sm flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
              Pending Dispatch
            </p>
            <h3 className="whitespace-nowrap text-xl sm:text-3xl font-black text-amber-600">
              {loading ? "..." : stats?.pendingParcels || 0}
            </h3>
            <span className="text-[11px] text-amber-500 font-bold">
              Needs driver assignment
            </span>
          </div>
          <div className="hidden sm:flex w-12 h-12 shrink-0 rounded-xl bg-amber-50 text-amber-600 items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      <FleetMap drivers={drivers} pendingParcels={pendingParcels} />

      {/* Pending Dispatch Queue */}
      <div className="bg-white rounded-3xl border border-ink-200 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-ink-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Unassigned Shipments Awaiting Dispatch
            </h2>
            <p className="text-xs text-ink-500">
              Assign available couriers so pickups can begin
            </p>
          </div>
          <Link
            to="/admin/parcels"
            className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            All Parcels <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-ink-400 text-sm">
            Loading dispatch queue...
          </div>
        ) : pendingParcels.length === 0 ? (
          <div className="p-12 text-center text-ink-400 text-sm">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            All shipments have been assigned to drivers. Queue is clear!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-ink-700">
              <thead className="bg-ink-50 text-xs font-bold uppercase tracking-wider text-ink-500 border-b border-ink-200">
                <tr>
                  <th className="py-3 px-4">Tracking #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Pickup Origin</th>
                  <th className="py-3 px-4">Delivery Point</th>
                  <th className="py-3 px-4">Type & Weight</th>
                  <th className="py-3 px-4 text-right">Dispatch Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {pendingParcels.map((p) => (
                  <tr key={p._id} className="hover:bg-ink-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-600 text-xs">
                      {p.trackingNumber}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-ink-900">
                      {p.customer?.name || "Customer"}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-xs text-ink-600">
                      {p.pickupLocation?.address}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-xs text-ink-600">
                      {p.deliveryLocation?.address}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium">
                      {p.parcelType} ({p.weight} kg)
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenAssign(p)}
                        className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-sm transition flex items-center gap-1.5 ml-auto"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Assign Driver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Driver Modal */}
      {assignModalOpen && selectedParcel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-ink-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-ink-900">
                  Assign Courier Personnel
                </h3>
                <p className="text-xs text-ink-500 font-mono">
                  {selectedParcel.trackingNumber}
                </p>
              </div>
            </div>

            <div className="bg-ink-50 p-3.5 rounded-2xl border border-ink-200 text-xs space-y-1.5 mb-5">
              <p>
                <strong>Pickup:</strong>{" "}
                {selectedParcel.pickupLocation?.address}
              </p>
              <p>
                <strong>Delivery:</strong>{" "}
                {selectedParcel.deliveryLocation?.address}
              </p>
              <p>
                <strong>Package:</strong> {selectedParcel.parcelType} (
                {selectedParcel.weight} kg)
              </p>
            </div>

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-ink-700 block mb-1.5">
                  Select Courier Driver:
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  required
                  className="w-full text-sm p-3 rounded-xl border border-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                >
                  <option value="">-- Choose Driver --</option>
                  {drivers.map((d) => (
                    <option key={d._id} value={d._id} disabled={!canTake(d, selectedParcel)}>
                      {driverOptionLabel(d, selectedParcel)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-ink-600 hover:bg-ink-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning || !selectedDriverId}
                  className="px-5 py-2 text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white rounded-xl shadow-md transition"
                >
                  {assigning ? "Assigning..." : "Confirm Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
