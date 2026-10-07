// Shared delivery-route logic used by the map, the driver navigation page and
// the tracking pages.
import { distanceMeters } from "../services/algorithms/haversine";

export { distanceMeters };

export const ACTIVE_STATUSES = ["Assigned", "Picked Up", "In Transit"];

// Accepts {latitude, longitude} (API shape) or {lat, lng} (map shape) and
// returns {lat, lng, address} or null when coordinates are missing/invalid.
export const toPoint = (location) => {
  if (!location) return null;
  const rawLat = location.latitude ?? location.lat;
  const rawLng = location.longitude ?? location.lng;
  // Number(null) is 0, so reject missing values before converting
  if (rawLat === null || rawLat === undefined || rawLng === null || rawLng === undefined) {
    return null;
  }
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng, address: location.address || "" };
};

/**
 * Which leg of the trip should be routed right now.
 *  - Assigned            -> driver's live position to the pickup
 *  - Picked Up/In Transit -> driver's live position to the destination
 *  - otherwise (or no driver GPS) -> pickup to destination overview
 */
export const getRouteLeg = ({ status, pickup, delivery, driver }) => {
  const p = toPoint(pickup);
  const d = toPoint(delivery);
  const g = toPoint(driver);

  if (g && status === "Assigned" && p) {
    return { from: g, to: p, kind: "toPickup", label: "Driver → Pickup" };
  }
  if (g && (status === "Picked Up" || status === "In Transit") && d) {
    return { from: g, to: d, kind: "toDelivery", label: "Driver → Destination" };
  }
  if (p && d) {
    return { from: p, to: d, kind: "overview", label: "Pickup → Destination" };
  }
  return null;
};

// The stop the driver is currently heading to.
export const getNextStop = (parcel) => {
  if (!parcel) return null;
  if (parcel.status === "Assigned") {
    return {
      kind: "pickup",
      title: "Head to pickup",
      location: parcel.pickupLocation,
      contact: parcel.pickupContact,
    };
  }
  if (parcel.status === "Picked Up" || parcel.status === "In Transit") {
    return {
      kind: "delivery",
      title: "Deliver to customer",
      location: parcel.deliveryLocation,
      contact: parcel.deliveryContact,
    };
  }
  return null;
};

// Opens turn-by-turn directions in Google Maps (no API key needed).
// Without an origin, Google Maps uses the device's current location.
export const directionsUrl = (to, from = null) => {
  const dest = toPoint(to);
  if (!dest) return null;
  const params = new URLSearchParams({
    api: "1",
    destination: `${dest.lat},${dest.lng}`,
    travelmode: "driving",
  });
  const origin = toPoint(from);
  if (origin) params.set("origin", `${origin.lat},${origin.lng}`);
  return `https://www.google.com/maps/dir/?${params}`;
};

export const formatDistance = (meters) =>
  meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;

export const formatDuration = (seconds) => {
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min`;
};
