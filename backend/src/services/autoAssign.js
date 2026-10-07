import Parcel from "../models/Parcel.js";
import User from "../models/User.js";
import { FLEET } from "../config/fleet.js";
import { findRoute } from "./roadRouter.js";
import { pickBestDriver } from "./algorithms/driverAssignment.js";

// Database side of auto-assignment: loads candidate drivers, claims parcels,
// and retries parcels that are still Pending (no suitable driver earlier).

const ACTIVE_STATUSES = ["Assigned", "Picked Up", "In Transit"];

const safeRoute = (...args) => {
  try {
    return findRoute(...args);
  } catch {
    return null; // road graph missing: pickBestDriver falls back to straight-line
  }
};

// Online drivers with a recent GPS fix, plus their current workload
const loadCandidates = async () => {
  const cutoff = new Date(Date.now() - FLEET.locationMaxAgeMinutes * 60 * 1000);
  const drivers = await User.find({
    role: "driver",
    isAvailable: true,
    locationUpdatedAt: { $gte: cutoff },
  })
    .select("_id name vehicleType currentLocation locationUpdatedAt")
    .lean();
  if (!drivers.length) return null;

  const counts = await Parcel.aggregate([
    { $match: { driver: { $in: drivers.map((d) => d._id) }, status: { $in: ACTIVE_STATUSES } } },
    { $group: { _id: "$driver", count: { $sum: 1 } } },
  ]);
  return { drivers, activeJobs: new Map(counts.map((c) => [String(c._id), c.count])) };
};

const assignWith = async (parcel, ctx) => {
  const { latitude, longitude } = parcel.pickupLocation || {};
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const best = pickBestDriver({
    pickup: { lat: latitude, lng: longitude },
    weightKg: parcel.weight,
    drivers: ctx.drivers,
    activeJobs: ctx.activeJobs,
    route: safeRoute,
  });
  if (!best) return null;

  // Only claim it if it's still Pending (an admin may have acted meanwhile)
  const updated = await Parcel.findOneAndUpdate(
    { _id: parcel._id, status: "Pending" },
    { driver: best.driver._id, status: "Assigned" },
    { returnDocument: "after" },
  );
  if (updated) {
    const id = String(best.driver._id);
    ctx.activeJobs.set(id, (ctx.activeJobs.get(id) || 0) + 1);
  }
  return updated;
};

/** Assign one Pending parcel. Returns the updated parcel, or null if nobody suits. */
export const autoAssignParcel = async (parcel) => {
  const ctx = await loadCandidates();
  return ctx ? assignWith(parcel, ctx) : null;
};

let running = false;
let rerun = false;

/** Try to assign the oldest Pending parcels. Returns how many were assigned. */
export const assignPendingParcels = async () => {
  if (running) {
    rerun = true; // a driver came online mid-sweep: go again afterwards
    return 0;
  }
  running = true;
  let assigned = 0;
  try {
    do {
      rerun = false;
      const pending = await Parcel.find({ status: "Pending" })
        .sort({ createdAt: 1 })
        .limit(FLEET.pendingSweepBatch)
        .select("_id pickupLocation weight")
        .lean();
      if (!pending.length) break;
      const ctx = await loadCandidates();
      if (!ctx) break;
      for (const parcel of pending) {
        if (await assignWith(parcel, ctx)) assigned++;
      }
    } while (rerun);
  } finally {
    running = false;
  }
  return assigned;
};

const runSweep = (reason) =>
  assignPendingParcels()
    .then((n) => n && console.log(`Auto-assigned ${n} pending parcel(s) (${reason}).`))
    .catch((err) => console.error("Pending sweep error:", err));

/** Fire-and-forget retry, e.g. when a driver comes online. */
export const triggerPendingSweep = (reason = "driver available") => {
  runSweep(reason);
};

/** Periodic retry so parcels never sit Pending while a driver is free. */
export const startPendingSweep = () => {
  const timer = setInterval(() => runSweep("periodic"), FLEET.pendingSweepSeconds * 1000);
  timer.unref();
};
