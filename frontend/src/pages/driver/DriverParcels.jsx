import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../services/api";
import {
  Truck,
  Package,
  Compass,
  CheckCircle2,
  Check,
  Search,
} from "lucide-react";

const DriverParcels = () => {
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active"); // 'active', 'delivered', 'all'
  const [search, setSearch] = useState("");
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

  const filtered = parcels.filter((p) => {
    let matchesTab = true;
    if (filter === "active") {
      matchesTab = ["Assigned", "Picked Up", "In Transit"].includes(p.status);
    } else if (filter === "delivered") {
      matchesTab = p.status === "Delivered";
    }

    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.trackingNumber?.toLowerCase().includes(q) ||
      p.deliveryContact?.name?.toLowerCase().includes(q) ||
      p.deliveryLocation?.address?.toLowerCase().includes(q);

    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900 flex items-center gap-2.5">
            <Truck className="w-7 h-7 text-brand-600" />
            Assigned Delivery Orders
          </h1>
          <p className="text-sm text-ink-500 mt-1">
            Manage assigned deliveries, update statuses, and follow active
            routes.
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-ink-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 w-full md:w-auto">
          <button
            onClick={() => setFilter("active")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              filter === "active"
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-ink-100 text-ink-600 hover:bg-ink-200"
            }`}
          >
            Active Deliveries
          </button>
          <button
            onClick={() => setFilter("delivered")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              filter === "delivered"
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-ink-100 text-ink-600 hover:bg-ink-200"
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              filter === "all"
                ? "bg-brand-600 text-white shadow-sm"
                : "bg-ink-100 text-ink-600 hover:bg-ink-200"
            }`}
          >
            All Assigned ({parcels.length})
          </button>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-ink-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search tracking, recipient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-ink-200 bg-ink-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Cards List */}
      {loading ? (
        <div className="p-16 text-center text-ink-400 text-sm">
          Loading assigned deliveries...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-ink-200 text-center shadow-sm">
          <Package className="w-12 h-12 text-ink-300 mx-auto mb-3" />
          <h3 className="font-bold text-ink-800 text-base mb-1">
            No Deliveries in this View
          </h3>
          <p className="text-xs text-ink-500">
            {filter === "active"
              ? "No active deliveries pending right now. Great job!"
              : "No deliveries found matching current criteria."}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {filtered.map((item) => (
            <div
              key={item._id}
              className="bg-white rounded-2xl border border-ink-200 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden"
            >
              <div className="p-6 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-ink-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ink-400 tracking-wider block">
                      Tracking ID
                    </span>
                    <span className="font-mono font-bold text-brand-600 text-sm">
                      {item.trackingNumber}
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      item.status === "Delivered"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-brand-100 text-brand-800"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                {/* Sender & Receiver Coordinates/Addresses */}
                <div className="space-y-3 text-xs">
                  <div className="bg-ink-50 p-3 rounded-xl border border-ink-100 flex items-start gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0"></span>
                    <div>
                      <span className="font-bold text-ink-700 block">
                        Pickup: {item.pickupContact?.name} (
                        {item.pickupContact?.phone})
                      </span>
                      <p className="text-ink-500 text-[11px] mt-0.5">
                        {item.pickupLocation?.address}
                      </p>
                    </div>
                  </div>

                  <div className="bg-ink-50 p-3 rounded-xl border border-ink-100 flex items-start gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1 shrink-0"></span>
                    <div>
                      <span className="font-bold text-ink-700 block">
                        Deliver to: {item.deliveryContact?.name} (
                        {item.deliveryContact?.phone})
                      </span>
                      <p className="text-ink-500 text-[11px] mt-0.5">
                        {item.deliveryLocation?.address}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Specs */}
                <div className="flex items-center justify-between text-xs text-ink-500 px-1">
                  <span>
                    Type:{" "}
                    <strong className="text-ink-800">
                      {item.parcelType}
                    </strong>
                  </span>
                  <span>
                    Weight:{" "}
                    <strong className="text-ink-800">{item.weight} kg</strong>
                  </span>
                  <span>
                    Freight:{" "}
                    <strong className="text-emerald-600">
                      Rs. {item.price}
                    </strong>
                  </span>
                </div>

                {item.notes && (
                  <p className="text-xs bg-amber-50 text-amber-800 p-2.5 rounded-xl border border-amber-200">
                    <strong>Note:</strong> {item.notes}
                  </p>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="p-4 bg-ink-50/80 border-t border-ink-100 flex flex-wrap items-center justify-between gap-2">
                {["Assigned", "Picked Up", "In Transit"].includes(item.status) ? (
                <Link
                  to={`/driver/navigation?parcel=${item._id}`}
                  className="bg-white hover:bg-ink-100 text-ink-700 border border-ink-300 text-xs font-bold py-2 px-3.5 rounded-xl flex items-center gap-1.5 transition"
                >
                  <Compass className="w-3.5 h-3.5 text-brand-600" />
                  Navigate
                </Link>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  {item.status === "Assigned" && (
                    <button
                      onClick={() => handleUpdateStatus(item._id, "Picked Up")}
                      disabled={updatingId === item._id}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-3.5 rounded-xl shadow-sm transition"
                    >
                      Pick Up Parcel
                    </button>
                  )}

                  {item.status === "Picked Up" && (
                    <button
                      onClick={() => handleUpdateStatus(item._id, "In Transit")}
                      disabled={updatingId === item._id}
                      className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold py-2 px-3.5 rounded-xl shadow-sm transition"
                    >
                      Start Transit
                    </button>
                  )}

                  {item.status === "In Transit" && (
                    <button
                      onClick={() => handleUpdateStatus(item._id, "Delivered")}
                      disabled={updatingId === item._id}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-3.5 rounded-xl shadow-sm transition flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Mark Delivered
                    </button>
                  )}

                  {item.status === "Delivered" && (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Delivered
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DriverParcels;
