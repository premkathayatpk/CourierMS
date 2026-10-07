// Address search & reverse geocoding via our backend (/api/geo/*), which
// restricts results to Kathmandu, Lalitpur and Bhaktapur, ranks them and
// caches Nominatim lookups. See backend/src/services/addressResolution.js.
import { apiFetch } from "./api";

/** Places matching `query` inside the service area: [{ name, lat, lng }] */
export async function searchPlaces(query) {
  if (!query || query.trim().length < 2) return [];
  try {
    const res = await apiFetch(`/geo/search?q=${encodeURIComponent(query.trim())}`);
    return res.results || [];
  } catch (err) {
    console.warn("Place search failed:", err.message);
    return [];
  }
}

/** Address for a point: { address, inServiceArea, district } */
export async function reverseGeocode(lat, lng) {
  try {
    return await apiFetch(`/geo/reverse?lat=${lat}&lng=${lng}`);
  } catch {
    return { address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, inServiceArea: null, district: null };
  }
}

let serviceAreaPromise = null;
/** District outlines (GeoJSON), fetched once per page load. */
export function getServiceArea() {
  serviceAreaPromise ||= apiFetch("/geo/service-area").catch((err) => {
    serviceAreaPromise = null;
    throw err;
  });
  return serviceAreaPromise;
}
