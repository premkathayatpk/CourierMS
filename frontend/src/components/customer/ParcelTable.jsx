import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../services/api";
import {
  Package,
  Search,
  Compass,
  Clock,
  XCircle,
  Truck,
} from "lucide-react";
import { statusBadgeClass } from "../../utils/status";

const ParcelTable = () => {
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  const fetchParcels = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/parcel/myParcel");
      if (res.success) {
        setParcels(res.data || []);
      }
    } catch (err) {
      console.error("Error fetching parcels", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParcels();
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this pending parcel?")) {
      return;
    }
    setCancellingId(id);
    try {
      const res = await apiFetch(`/parcel/cancel/${id}`, { method: "PATCH" });
      if (res.success) {
        setParcels((prev) =>
          prev.map((p) => (p._id === id ? { ...p, status: "Cancelled" } : p))
        );
      }
    } catch (err) {
      alert(err.message || "Failed to cancel parcel");
    } finally {
      setCancellingId(null);
    }
  };


  const statuses = [
    "All",
    "Pending",
    "Assigned",
    "In Transit",
    "Delivered",
    "Cancelled",
  ];

  const filtered = parcels.filter((p) => {
    const matchesStatus =
      filterStatus === "All" ||
      p.status === filterStatus ||
      (filterStatus === "In Transit" && ["Picked Up", "In Transit"].includes(p.status));

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.trackingNumber?.toLowerCase().includes(q) ||
      p.deliveryContact?.name?.toLowerCase().includes(q) ||
      p.deliveryLocation?.address?.toLowerCase().includes(q) ||
      p.parcelType?.toLowerCase().includes(q);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-ink-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {statuses.map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                filterStatus === st
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-ink-100 text-ink-600 hover:bg-ink-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-ink-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search tracking, recipient, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-ink-50 focus:bg-white"
          />
        </div>
      </div>

      {/* Grid of Parcel Cards */}
      {loading ? (
        <div className="p-16 text-center text-ink-400 text-sm">
          Loading parcels...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-ink-200 text-center shadow-sm">
          <Package className="w-12 h-12 text-ink-300 mx-auto mb-3" />
          <h3 className="font-bold text-ink-800 text-base mb-1">
            No Shipments Found
          </h3>
          <p className="text-xs text-ink-500">
            {searchQuery || filterStatus !== "All"
              ? "No parcels match your search query or status filter."
              : "You haven't booked any parcels yet."}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => (
            <div
              key={item._id}
              className="bg-white rounded-2xl border border-ink-200 shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden"
            >
              <div className="p-5 space-y-4">
                {/* Header Tracking & Status */}
                <div className="flex items-center justify-between gap-2 border-b border-ink-100 pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-ink-400 tracking-wider block">
                      Tracking ID
                    </span>
                    <span className="font-mono font-bold text-brand-600 text-sm">
                      {item.trackingNumber}
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${statusBadgeClass(
                      item.status
                    )}`}
                  >
                    {item.status}
                  </span>
                </div>

                {/* Route Points */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0"></span>
                    <div>
                      <span className="font-semibold text-ink-800">
                        {item.pickupLocation?.address}
                      </span>
                      <p className="text-ink-400 text-[11px]">
                        Sender: {item.pickupContact?.name} ({item.pickupContact?.phone})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 mt-1 shrink-0"></span>
                    <div>
                      <span className="font-semibold text-ink-800">
                        {item.deliveryLocation?.address}
                      </span>
                      <p className="text-ink-400 text-[11px]">
                        Receiver: {item.deliveryContact?.name} ({item.deliveryContact?.phone})
                      </p>
                    </div>
                  </div>
                </div>

                {/* Specs Pill info */}
                <div className="grid grid-cols-3 gap-2 bg-ink-50 p-2.5 rounded-xl text-center text-xs">
                  <div>
                    <span className="text-[10px] text-ink-400 block">Category</span>
                    <span className="font-bold text-ink-700">{item.parcelType}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-400 block">Weight</span>
                    <span className="font-bold text-ink-700">{item.weight} kg</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-400 block">Freight</span>
                    <span className="font-bold text-emerald-600">Rs. {item.price}</span>
                  </div>
                </div>

                {/* Driver information if assigned */}
                {item.driver ? (
                  <div className="bg-brand-50/70 p-2.5 rounded-xl border border-brand-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-brand-600" />
                      <div>
                        <span className="font-semibold text-ink-900 block">
                          {item.driver.name}
                        </span>
                        <span className="text-[11px] text-ink-500">
                          {item.driver.vehicleType || "Courier"} • {item.driver.phone}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-brand-600 text-white font-bold px-2 py-0.5 rounded-md">
                      Active
                    </span>
                  </div>
                ) : item.status === "Pending" ? (
                  <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>Awaiting driver assignment by fleet manager.</span>
                  </div>
                ) : null}
              </div>

              {/* Bottom Actions */}
              <div className="p-4 bg-ink-50/80 border-t border-ink-100 flex items-center gap-2">
                <Link
                  to={`/customer/parcel/${item._id}`}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition"
                >
                  <Compass className="w-3.5 h-3.5" />
                  Live Route Map
                </Link>

                {["Pending", "Assigned"].includes(item.status) && (
                  <button
                    onClick={() => handleCancel(item._id)}
                    disabled={cancellingId === item._id}
                    className="p-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition"
                    title="Cancel Booking"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ParcelTable;
