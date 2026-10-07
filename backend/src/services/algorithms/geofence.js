/**
 * Geofencing — point-in-polygon test (ray casting / even-odd rule).
 *
 * Cast a horizontal ray from the point to the east and count how many polygon
 * edges it crosses: odd = inside, even = outside. Holes are handled by
 * testing them the same way (inside a hole = outside the polygon).
 *
 * A bounding-box check runs first so most far-away points are rejected in O(1).
 * Time: O(v) for v polygon vertices. Coordinates are GeoJSON [lng, lat].
 *
 * Used by: limiting pickup and delivery to Kathmandu, Lalitpur and Bhaktapur
 * districts, and filtering geocoding results to the service area.
 */

/** Ray casting against a single ring [[lng, lat], ...]. */
export const pointInRing = (lng, lat, ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
};

/** Polygon = [outerRing, hole1, hole2, ...] */
export const pointInPolygon = (lng, lat, polygon) => {
  if (!pointInRing(lng, lat, polygon[0])) return false;
  for (let h = 1; h < polygon.length; h++) {
    if (pointInRing(lng, lat, polygon[h])) return false;
  }
  return true;
};

/** Precompute bounding boxes so lookups can skip far-away features. */
export const prepareFeatures = (featureCollection) =>
  featureCollection.features.map((feature) => {
    const { type, coordinates } = feature.geometry;
    const polygons = type === "Polygon" ? [coordinates] : coordinates;
    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
    for (const poly of polygons) {
      for (const [lng, lat] of poly[0]) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
    return { name: feature.properties?.name, polygons, bbox: [minLng, minLat, maxLng, maxLat] };
  });

/**
 * Returns the name of the feature (district) containing the point, or null.
 * `features` comes from prepareFeatures().
 */
export const findContainingFeature = (lat, lng, features) => {
  for (const f of features) {
    const [minLng, minLat, maxLng, maxLat] = f.bbox;
    if (lng < minLng || lng > maxLng || lat < minLat || lat > maxLat) continue;
    if (f.polygons.some((poly) => pointInPolygon(lng, lat, poly))) return f.name;
  }
  return null;
};
