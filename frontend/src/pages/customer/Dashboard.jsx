import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../../services/api";
import {
  Package,
  Truck,
  CheckCircle2,
  PlusCircle,
  Search,
  Compass,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { statusBadgeClass } from "../../utils/status";

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trackInput, setTrackInput] = useState("");

  useEffect(() => {
    const fetchParcels = async () => {
      try {
        const res = await apiFetch("/parcel/myParcel");
        if (res.success) {
          setParcels(res.data || []);
        }
      } catch (err) {
        console.error("Dashboard parcel error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchParcels();
  }, []);

  const total = parcels.length;
  const inTransit = parcels.filter((p) =>
    ["Assigned", "Picked Up", "In Transit"].includes(p.status),
  ).length;
  const delivered = parcels.filter((p) => p.status === "Delivered").length;
  const totalSpent = parcels
    .filter((p) => p.status !== "Cancelled")
    .reduce((sum, p) => sum + (p.price || 0), 0);

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    if (trackInput.trim()) {
      navigate(`/track/${encodeURIComponent(trackInput.trim())}`);
    }
  };


  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="border-b border-ink-200 pb-6">
        <div className="max-w-3xl">
          <span className="mb-2 inline-block text-xs font-bold uppercase text-brand-700">
            Customer dashboard
          </span>
          <h1 className="mb-2 text-2xl font-bold text-ink-900 sm:text-3xl">
            Your deliveries
          </h1>
          <p className="mb-5 text-sm text-ink-500">
            Book a parcel, follow its progress, or review recent shipments.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/customer/createParcel"
              className="flex items-center gap-2 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              <PlusCircle className="w-4 h-4" /> Book New Parcel
            </Link>
            <Link
              to="/customer/parcels"
              className="rounded-md border border-ink-300 px-4 py-2.5 text-sm font-semibold text-ink-600 transition hover:bg-white"
            >
              View All Parcels
            </Link>
          </div>
        </div>

        {/* Quick Tracking Search in Banner */}
        <div className="mt-5 max-w-xl border-t border-ink-200 pt-5">
          <form onSubmit={handleTrackSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-ink-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Enter Tracking # (e.g. TRK-...)"
                value={trackInput}
                onChange={(e) => setTrackInput(e.target.value)}
                className="w-full rounded-md border border-ink-300 bg-white py-2.5 pl-10 pr-4 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <button
              type="submit"
              className="shrink-0 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              Track Now
            </button>
          </form>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-ink-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
              Total Booked
            </p>
            <h3 className="text-2xl sm:text-3xl font-black text-ink-900">
              {loading ? "..." : total}
            </h3>
            <span className="text-[11px] text-ink-400">
              All recorded shipments
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-ink-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
              In Delivery
            </p>
            <h3 className="text-2xl sm:text-3xl font-black text-brand-600">
              {loading ? "..." : inTransit}
            </h3>
            <span className="text-[11px] text-brand-400 font-medium">
              On the road
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-ink-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
              Delivered
            </p>
            <h3 className="text-2xl sm:text-3xl font-black text-emerald-600">
              {loading ? "..." : delivered}
            </h3>
            <span className="text-[11px] text-emerald-500 font-medium">
              Completed
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-ink-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-1">
              Total Paid
            </p>
            <h3 className="text-2xl sm:text-3xl font-black text-violet-700">
              {loading ? "..." : `Rs. ${totalSpent}`}
            </h3>
            <span className="text-[11px] text-ink-400">
              Total freight cost
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Recent Shipments */}
      <div className="bg-white rounded-2xl border border-ink-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-ink-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink-900">
              Recent Shipments
            </h2>
            <p className="text-xs text-ink-500">
              Live overview of your latest shipments
            </p>
          </div>
          <Link
            to="/customer/parcels"
            className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            View All ({parcels.length}) <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-8 text-center text-ink-400 text-sm">
            Loading your parcels...
          </div>
        ) : parcels.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-ink-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-ink-800 mb-1">
              No Shipments Yet
            </h3>
            <p className="text-xs text-ink-500 max-w-sm mx-auto mb-4">
              You haven't booked any parcels yet. Book a courier and follow its
              progress here.
            </p>
            <Link
              to="/customer/createParcel"
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-md transition"
            >
              <PlusCircle className="w-4 h-4" /> Book First Parcel
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-ink-700">
              <thead className="bg-ink-50 text-xs font-bold uppercase tracking-wider text-ink-500 border-b border-ink-200">
                <tr>
                  <th className="py-3 px-4">Tracking #</th>
                  <th className="py-3 px-4">Type & Weight</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Delivery Route</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {parcels.slice(0, 5).map((p) => (
                  <tr key={p._id} className="hover:bg-ink-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-600 text-xs">
                      {p.trackingNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-ink-900">
                        {p.parcelType}
                      </div>
                      <span className="text-xs text-ink-400">
                        {p.weight} kg
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-ink-800">
                        {p.deliveryContact?.name}
                      </div>
                      <div className="text-xs text-ink-400">
                        {p.deliveryContact?.phone}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="text-xs truncate text-ink-700 font-medium">
                        To: {p.deliveryLocation?.address}
                      </p>
                      <p className="text-[11px] truncate text-ink-400">
                        From: {p.pickupLocation?.address}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 text-xs font-bold rounded-full border ${statusBadgeClass(
                          p.status,
                        )}`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/customer/parcel/${p._id}`}
                          className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg text-xs font-semibold transition"
                        >
                          View Map
                        </Link>
                        <Link
                          to={`/track/${p.trackingNumber}`}
                          className="px-2.5 py-1.5 bg-ink-100 hover:bg-ink-200 text-ink-700 rounded-lg text-xs font-medium transition"
                          title="Track on live map"
                        >
                          <Compass className="w-3.5 h-3.5" />
                        </Link>
                      </div>
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

export default CustomerDashboard;
