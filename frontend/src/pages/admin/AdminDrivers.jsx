import React, { useEffect, useState } from "react";
import { apiFetch } from "../../services/api";
import { Truck, Phone, Mail, MapPin, Search } from "lucide-react";

const AdminDrivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/user/drivers");
      if (res.success) {
        setDrivers(res.drivers || []);
      }
    } catch (err) {
      console.error("Error fetching drivers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const filtered = drivers.filter((d) => {
    const q = search.toLowerCase();
    return (
      d.name?.toLowerCase().includes(q) ||
      d.email?.toLowerCase().includes(q) ||
      d.phone?.toLowerCase().includes(q) ||
      d.vehicleType?.toLowerCase().includes(q) ||
      d.licenseNumber?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900 flex items-center gap-2.5">
            <Truck className="w-7 h-7 text-brand-600" />
            Courier Fleet Management
          </h1>
          <p className="text-sm text-ink-500 mt-1">
            Registered courier personnel, vehicle specs, and live availability.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-ink-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search driver, vehicle, license..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2.5 rounded-xl border border-ink-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-ink-400 text-sm">Loading courier fleet...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-ink-200 text-center shadow-sm">
          <Truck className="w-12 h-12 text-ink-300 mx-auto mb-3" />
          <p className="text-ink-600 font-bold text-sm">No drivers found.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((d) => (
            <div
              key={d._id}
              className="bg-white p-6 rounded-3xl border border-ink-200 shadow-sm space-y-4 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between pb-3 border-b border-ink-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-600 font-black flex items-center justify-center text-base">
                    {d.name?.charAt(0) || "D"}
                  </div>
                  <div>
                    <h3 className="font-bold text-ink-900 text-sm">{d.name}</h3>
                    <span className="text-[11px] text-ink-400">Driver</span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                    d.isAvailable !== false
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-ink-100 text-ink-600 border-ink-200"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      d.isAvailable !== false ? "bg-emerald-500 animate-pulse" : "bg-ink-400"
                    }`}
                  ></span>
                  {d.isAvailable !== false ? "Online" : "Offline"}
                </span>
              </div>

              <div className="space-y-2 text-xs text-ink-600">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-ink-400" />
                  <span className="truncate">{d.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-ink-400" />
                  <span>{d.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-ink-400" />
                  <span>
                    Vehicle: <strong>{d.vehicleType || "Bike"}</strong> ({d.licenseNumber || "Standard License"})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-ink-400" />
                  <span>
                    GPS:{" "}
                    {d.currentLocation?.latitude
                      ? `${d.currentLocation.latitude.toFixed(3)}, ${d.currentLocation.longitude.toFixed(3)}`
                      : "Kathmandu Valley Hub"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDrivers;
