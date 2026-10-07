/**
 * Haversine formula — great-circle distance between two points on Earth.
 *
 *   a = sin²(Δφ/2) + cos φ1 · cos φ2 · sin²(Δλ/2)
 *   d = 2R · asin(√a)
 *
 * Accurate to ~0.5% (Earth isn't a perfect sphere), which is plenty for a city.
 * Time: O(1).
 *
 * Used by: A* heuristic, nearest-road snapping, geocoding de-duplication,
 * distance fallback for pricing.
 */
export const EARTH_RADIUS_M = 6371000;

const toRad = (deg) => (deg * Math.PI) / 180;

/** Distance in metres between (lat1, lng1) and (lat2, lng2). */
export const haversineMeters = (lat1, lng1, lat2, lng2) => {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
};

/** Same as haversineMeters but for {lat, lng} objects. */
export const distanceBetween = (a, b) => haversineMeters(a.lat, a.lng, b.lat, b.lng);
