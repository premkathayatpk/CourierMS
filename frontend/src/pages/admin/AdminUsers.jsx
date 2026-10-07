import React, { useEffect, useState } from "react";
import { apiFetch } from "../../services/api";
import { Users, Search } from "lucide-react";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const res = await apiFetch("/user/all");
        if (res.success) {
          setUsers(res.users || []);
        }
      } catch (err) {
        console.error("Error fetching users", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filtered = users.filter((u) => {
    const matchesRole = roleFilter === "All" || u.role === roleFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.phone?.toLowerCase().includes(q);
    return matchesRole && matchesSearch;
  });

  const roleBadge = (role) => {
    switch (role) {
      case "admin":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "driver":
        return "bg-brand-100 text-brand-800 border-brand-200";
      case "customer":
      default:
        return "bg-ink-100 text-ink-800 border-ink-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-brand-600" />
            Users & Customer Directory
          </h1>
          <p className="text-sm text-ink-500 mt-1">
            Overview of all accounts registered across the CourierMS logistics platform.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs font-semibold p-2.5 rounded-xl border border-ink-200 bg-white"
          >
            <option value="All">All Roles</option>
            <option value="customer">Customers</option>
            <option value="driver">Drivers</option>
            <option value="admin">Admins</option>
          </select>

          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-ink-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-ink-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-ink-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-ink-400 text-sm">Loading users...</div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-ink-400 text-sm">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-ink-700">
              <thead className="bg-ink-50 text-xs font-bold uppercase tracking-wider text-ink-500 border-b border-ink-200">
                <tr>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Phone</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Vehicle / License</th>
                  <th className="py-3.5 px-4">Registered Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filtered.map((u) => (
                  <tr key={u._id} className="hover:bg-ink-50/80 transition">
                    <td className="py-3.5 px-4 font-semibold text-ink-900 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-ink-100 text-ink-700 font-bold text-xs flex items-center justify-center">
                        {u.name?.charAt(0) || "U"}
                      </div>
                      {u.name}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-ink-600">{u.email}</td>
                    <td className="py-3.5 px-4 text-xs text-ink-600">{u.phone}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full border ${roleBadge(
                          u.role
                        )}`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-ink-500">
                      {u.role === "driver"
                        ? `${u.vehicleType || "Bike"} • ${u.licenseNumber || "N/A"}`
                        : "—"}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-ink-400">
                      {new Date(u.createdAt).toLocaleDateString()}
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

export default AdminUsers;
