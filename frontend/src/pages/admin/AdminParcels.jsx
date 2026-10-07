import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../../services/api";
import { canTake, driverOptionLabel } from "../../utils/fleet";
import {
  Package,
  Search,
  Truck,
  Compass,
} from "lucide-react";
import { statusBadgeClass } from "../../utils/status";

const AdminParcels = () => {
  const [parcels, setParcels] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");

  // Assign Driver Modal
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [assigning, setAssigning] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [parcelsRes, driversRes] = await Promise.all([
        apiFetch("/parcel/allParcel"),
        apiFetch("/user/active-drivers"),
      ]);

      if (parcelsRes.success) setParcels(parcelsRes.data || []);
      if (driversRes.success) setDrivers(driversRes.drivers || []);
    } catch (err) {
      console.error("Admin parcels error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAssign = (parcel) => {
    setSelectedParcel(parcel);
    setSelectedDriverId(
      parcel.driver?._id ||
        [...drivers]
          .filter((d) => canTake(d, parcel))
          .sort((a, b) => (a.activeParcels || 0) - (b.activeParcels || 0))[0]?._id ||
        "",
    );
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
        setSelectedParcel(null);
        fetchData();
      }
    } catch (err) {
      alert(err.message || "Failed to assign driver");
    } finally {
      setAssigning(false);
    }
  };

  const statuses = [
    "All",
    "Pending",
    "Assigned",
    "Picked Up",
    "In Transit",
    "Delivered",
    "Cancelled",
  ];

  const filtered = parcels.filter((p) => {
    const matchesStatus = statusFilter === "All" || p.status === statusFilter;
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.trackingNumber?.toLowerCase().includes(q) ||
      p.customer?.name?.toLowerCase().includes(q) ||
      p.driver?.name?.toLowerCase().includes(q) ||
      p.deliveryContact?.name?.toLowerCase().includes(q) ||
      p.deliveryLocation?.address?.toLowerCase().includes(q);

    return matchesStatus && matchesSearch;
  });


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900 flex items-center gap-2.5">
          <Package className="w-7 h-7 text-brand-600" />
          Parcel Dispatch & Operations
        </h1>
        <p className="text-sm text-ink-500 mt-1">
          Monitor all customer bookings, route assignments, and driver statuses.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-ink-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {statuses.map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                statusFilter === st
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-ink-100 text-ink-600 hover:bg-ink-200"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-ink-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search tracking, user, driver..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-ink-200 bg-ink-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-ink-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-ink-400 text-sm">Loading all parcels...</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-ink-400 text-sm">
            No parcels found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-ink-700">
              <thead className="bg-ink-50 text-xs font-bold uppercase tracking-wider text-ink-500 border-b border-ink-200">
                <tr>
                  <th className="py-3 px-4">Tracking #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Pickup Origin</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4">Type & Weight</th>
                  <th className="py-3 px-4">Assigned Driver</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtered.map((p) => (
                  <tr key={p._id} className="hover:bg-ink-50/80 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-600 text-xs">
                      {p.trackingNumber}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-ink-900">
                      {p.customer?.name || "Customer"}
                      <span className="block text-[11px] text-ink-400">{p.customer?.phone}</span>
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
                    <td className="py-3.5 px-4 text-xs">
                      {p.driver ? (
                        <div>
                          <span className="font-bold text-ink-800">{p.driver.name}</span>
                          <span className="block text-[10px] text-ink-400">
                            {p.driver.vehicleType || "Bike"} • {p.driver.phone}
                          </span>
                        </div>
                      ) : (
                        <span className="text-amber-600 font-semibold text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 text-xs font-bold rounded-full border ${statusBadgeClass(
                          p.status
                        )}`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {p.status === "Pending" && (
                          <button
                            onClick={() => handleOpenAssign(p)}
                            className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition"
                          >
                            Assign
                          </button>
                        )}

                        <Link
                          to={`/customer/parcel/${p._id}`}
                          className="bg-ink-100 hover:bg-ink-200 text-ink-700 font-bold text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                        >
                          <Compass className="w-3.5 h-3.5 text-brand-600" /> Map
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

      {/* Assign Driver Modal */}
      {selectedParcel && (
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
                <strong>Pickup:</strong> {selectedParcel.pickupLocation?.address}
              </p>
              <p>
                <strong>Delivery:</strong> {selectedParcel.deliveryLocation?.address}
              </p>
              <p>
                <strong>Package:</strong> {selectedParcel.parcelType} ({selectedParcel.weight} kg)
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
                  onClick={() => setSelectedParcel(null)}
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

export default AdminParcels;
