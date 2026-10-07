import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { findContainingFeature, prepareFeatures } from "./algorithms/geofence.js";

// Pickup and delivery are only allowed inside these districts.
// Data: backend/data/valley-boundary.json (built by `npm run build:geo`).
const DATA_FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../data/valley-boundary.json",
);

export const SERVICE_AREA_NAME = "Kathmandu Valley (Kathmandu, Lalitpur, Bhaktapur)";

const boundary = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
const features = prepareFeatures(boundary);

/** [minLat, minLng, maxLat, maxLng] of the whole service area */
export const SERVICE_AREA_BBOX = boundary.bbox;

/** GeoJSON of the district outlines (for drawing on the map) */
export const serviceAreaGeoJson = boundary;

/** District name ("Kathmandu" | "Lalitpur" | "Bhaktapur") or null if outside. */
export const districtAt = (lat, lng) => findContainingFeature(lat, lng, features);

export const isInServiceArea = (lat, lng) => districtAt(lat, lng) !== null;
