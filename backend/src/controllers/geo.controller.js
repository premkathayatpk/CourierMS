import { findRoute } from "../services/roadRouter.js";
import { reverseGeocode, searchPlaces } from "../services/geocoder.js";
import { SERVICE_AREA_NAME, districtAt, serviceAreaGeoJson } from "../services/serviceArea.js";

// "27.7154,85.3123" -> { lat, lng } | null
const parsePoint = (value) => {
  const [lat, lng] = String(value || "").split(",").map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return null;
  }
  return { lat, lng };
};

// GET /api/geo/route?from=lat,lng&to=lat,lng — fastest road route (A*)
export const getRoute = (req, res) => {
  const from = parsePoint(req.query.from);
  const to = parsePoint(req.query.to);
  if (!from || !to) {
    return res.status(400).json({ success: false, message: "Use ?from=lat,lng&to=lat,lng" });
  }
  if (!districtAt(from.lat, from.lng) || !districtAt(to.lat, to.lng)) {
    return res.status(400).json({ success: false, message: `Routing is only available inside ${SERVICE_AREA_NAME}.` });
  }

  const route = findRoute(from.lat, from.lng, to.lat, to.lng);
  if (!route) {
    return res.status(404).json({ success: false, message: "No road route found between these points." });
  }
  const { coordinates, distanceMeters, durationSeconds } = route;
  return res.status(200).json({ success: true, route: { coordinates, distanceMeters, durationSeconds } });
};

// GET /api/geo/search?q=pulchowk
export const search = async (req, res) => {
  const q = String(req.query.q || "").slice(0, 200);
  const results = await searchPlaces(q);
  return res.status(200).json({ success: true, results });
};

// GET /api/geo/reverse?lat=..&lng=..
export const reverse = async (req, res) => {
  const point = parsePoint(`${req.query.lat},${req.query.lng}`);
  if (!point) return res.status(400).json({ success: false, message: "Valid lat and lng are required." });

  const district = districtAt(point.lat, point.lng);
  const address = await reverseGeocode(point.lat, point.lng);
  return res.status(200).json({ success: true, address, district, inServiceArea: Boolean(district) });
};

// GET /api/geo/service-area — district outlines for the map
export const serviceArea = (req, res) => {
  res.set("Cache-Control", "public, max-age=86400");
  return res.status(200).json({ success: true, name: SERVICE_AREA_NAME, geojson: serviceAreaGeoJson });
};
