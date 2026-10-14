import { haversineMeters } from "./haversine.js";
import { FLEET } from "../../config/fleet.js";


export const MAX_ACTIVE_JOBS = FLEET.maxActiveJobs;

const FALLBACK_DETOUR = 1.3;
const FALLBACK_SPEED_MPS = 25 / 3.6;

/** Heaviest parcel (kg) the vehicle may carry. Unknown types count as a Bike. */
export const vehicleMaxKg = (vehicleType) =>
  FLEET.vehicleMaxKg[vehicleType] ?? FLEET.vehicleMaxKg.Bike;

export const canCarry = (vehicleType, weightKg) => weightKg <= vehicleMaxKg(vehicleType);

const hasFix = (d) =>
  Number.isFinite(d.currentLocation?.latitude) && Number.isFinite(d.currentLocation?.longitude);

const isFresh = (d, now) =>
  d.locationUpdatedAt &&
  now - new Date(d.locationUpdatedAt).getTime() <= FLEET.locationMaxAgeMinutes * 60 * 1000;

/**
 * @param {{lat:number,lng:number}} pickup
 * @param {number} weightKg
 * @param {Array<{_id, vehicleType, currentLocation:{latitude,longitude}, locationUpdatedAt}>} drivers  online drivers
 * @param {Map<string,number>} activeJobs  driverId -> active parcel count
 * @param {(fromLat,fromLng,toLat,toLng) => {durationSeconds:number}|null} route
 * @param {number} [now]  epoch ms
 * @returns {{driver, travelSeconds:number, activeJobs:number, score:number}|null}
 */
export const pickBestDriver = ({ pickup, weightKg, drivers, activeJobs, route, now = Date.now() }) => {
  const shortlist = drivers
    .filter((d) => hasFix(d) && isFresh(d, now) && canCarry(d.vehicleType, weightKg))
    .map((driver) => ({
      driver,
      jobs: activeJobs.get(String(driver._id)) || 0,
      straight: haversineMeters(
        driver.currentLocation.latitude,
        driver.currentLocation.longitude,
        pickup.lat,
        pickup.lng,
      ),
    }))
    .filter((c) => c.jobs < FLEET.maxActiveJobs)
    .sort((a, b) => a.straight - b.straight)
    .slice(0, FLEET.shortlistSize);

  let best = null;
  for (const c of shortlist) {
    const { latitude, longitude } = c.driver.currentLocation;
    const r = route(latitude, longitude, pickup.lat, pickup.lng);
    const travelSeconds = r ? r.durationSeconds : (c.straight * FALLBACK_DETOUR) / FALLBACK_SPEED_MPS;
    const score = travelSeconds + c.jobs * FLEET.jobPenaltySeconds;
    if (!best || score < best.score || (score === best.score && c.jobs < best.activeJobs)) {
      best = { driver: c.driver, travelSeconds: Math.round(travelSeconds), activeJobs: c.jobs, score };
    }
  }
  return best;
};
