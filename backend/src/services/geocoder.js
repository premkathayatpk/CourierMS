import {
  nearestPlace,
  normalizeAddress,
  rankAndDedupe,
  scorePlaceMatch,
} from "./algorithms/addressResolution.js";
import { SERVICE_AREA_BBOX, isInServiceArea } from "./serviceArea.js";


const NOMINATIM = "https://nominatim.openstreetmap.org";
const USER_AGENT = "CourierMS/1.0 (courier management system; Kathmandu Valley)";

// Well-known places in the three districts (instant, offline-friendly results)
export const VALLEY_PLACES = [
  { name: "Thamel, Kathmandu", lat: 27.7154, lng: 85.3123 },
  { name: "New Road, Kathmandu", lat: 27.7041, lng: 85.3105 },
  { name: "Kathmandu Durbar Square", lat: 27.7044, lng: 85.3070 },
  { name: "Ratna Park, Kathmandu", lat: 27.7059, lng: 85.3153 },
  { name: "Putalisadak, Kathmandu", lat: 27.7046, lng: 85.3210 },
  { name: "Maitighar Mandala, Kathmandu", lat: 27.6947, lng: 85.3200 },
  { name: "New Baneshwor, Kathmandu", lat: 27.6915, lng: 85.3420 },
  { name: "Koteshwor Chowk, Kathmandu", lat: 27.6788, lng: 85.3497 },
  { name: "Tinkune, Kathmandu", lat: 27.6858, lng: 85.3470 },
  { name: "Tribhuvan International Airport", lat: 27.6966, lng: 85.3592 },
  { name: "Chabahil, Kathmandu", lat: 27.7176, lng: 85.3496 },
  { name: "Boudhanath Stupa, Kathmandu", lat: 27.7215, lng: 85.3621 },
  { name: "Maharajgunj, Kathmandu", lat: 27.7347, lng: 85.3278 },
  { name: "Budhanilkantha, Kathmandu", lat: 27.7650, lng: 85.3650 },
  { name: "Balaju, Kathmandu", lat: 27.7272, lng: 85.3044 },
  { name: "Swayambhunath, Kathmandu", lat: 27.7149, lng: 85.2904 },
  { name: "Kalanki Chowk, Kathmandu", lat: 27.6934, lng: 85.2818 },
  { name: "Kirtipur, Kathmandu", lat: 27.6788, lng: 85.2775 },
  { name: "Balkhu Chowk, Kathmandu", lat: 27.6801, lng: 85.2955 },
  { name: "Gongabu Bus Park, Kathmandu", lat: 27.7354, lng: 85.3149 },
  { name: "Patan Durbar Square, Lalitpur", lat: 27.6728, lng: 85.3252 },
  { name: "Pulchowk, Lalitpur", lat: 27.6780, lng: 85.3168 },
  { name: "Jawalakhel, Lalitpur", lat: 27.6727, lng: 85.3140 },
  { name: "Lagankhel, Lalitpur", lat: 27.6643, lng: 85.3183 },
  { name: "Kupondole, Lalitpur", lat: 27.6870, lng: 85.3155 },
  { name: "Satdobato, Lalitpur", lat: 27.6567, lng: 85.3256 },
  { name: "Gwarko, Lalitpur", lat: 27.6663, lng: 85.3387 },
  { name: "Ekantakuna, Lalitpur", lat: 27.6694, lng: 85.3077 },
  { name: "Godawari, Lalitpur", lat: 27.5930, lng: 85.3790 },
  { name: "Bhaktapur Durbar Square", lat: 27.6720, lng: 85.4290 },
  { name: "Suryabinayak, Bhaktapur", lat: 27.6630, lng: 85.4340 },
  { name: "Thimi, Bhaktapur", lat: 27.6810, lng: 85.3870 },
  { name: "Lokanthali, Bhaktapur", lat: 27.6750, lng: 85.3630 },
  { name: "Sallaghari, Bhaktapur", lat: 27.6720, lng: 85.4120 },
  { name: "Changunarayan, Bhaktapur", lat: 27.7163, lng: 85.4278 },
];

// ≤ 1 request/second to Nominatim: queue calls so each starts ≥ 1.1 s after the last
const MIN_INTERVAL_MS = 1100;
let queue = Promise.resolve();
let lastStart = 0;
const throttle = (task) => {
  const run = queue.then(async () => {
    const wait = lastStart + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastStart = Date.now();
    return task();
  });
  queue = run.catch(() => {}); // keep the queue going even if a task fails
  return run;
};

const nominatim = (pathAndQuery) =>
  throttle(async () => {
    const res = await fetch(`${NOMINATIM}${pathAndQuery}`, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "en" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    return res.json();
  });

const [minLat, minLng, maxLat, maxLng] = SERVICE_AREA_BBOX;
// Nominatim viewbox = left,top,right,bottom
const VIEWBOX = `${minLng},${maxLat},${maxLng},${minLat}`;

/**
 * Search for places in the valley. Returns up to 8 results:
 *   [{ name, lat, lng, source: "local" | "osm" }]
 */
export const searchPlaces = async (query) => {
  const q = normalizeAddress(query);
  if (q.length < 2) return [];

  // 1. Known landmarks
  const local = VALLEY_PLACES.map((p) => ({ ...p, source: "local", score: scorePlaceMatch(q, p.name) }))
    .filter((p) => p.score > 0);

  // 2. OpenStreetMap, only when the local list has no strong match
  let osm = [];
  if (!local.some((p) => p.score >= 85)) {
    try {
      const params = new URLSearchParams({
        q: query,
        format: "jsonv2",
        limit: "10",
        countrycodes: "np",
        viewbox: VIEWBOX,
        bounded: "1",
      });
      const data = await nominatim(`/search?${params}`);
      osm = data.map((item, i) => ({
        name: item.display_name,
        lat: Number(item.lat),
        lng: Number(item.lon),
        source: "osm",
        // Keep Nominatim's own ordering, below strong local matches
        score: 60 - i,
      }));
    } catch (err) {
      console.warn("Geocoding search failed:", err.message);
    }
  }

  // 3. Inside the three districts only, de-duplicated, best first
  return rankAndDedupe([...local, ...osm], { isInside: isInServiceArea }).map(
    ({ name, lat, lng, source }) => ({ name, lat, lng, source }),
  );
};

/** Coordinates -> human readable address (always returns a string). */
export const reverseGeocode = async (lat, lng) => {
  let address = null;
  try {
    const params = new URLSearchParams({ lat, lon: lng, format: "jsonv2", zoom: "17" });
    const data = await nominatim(`/reverse?${params}`);
    address = data.display_name || null;
  } catch (err) {
    console.warn("Reverse geocoding failed:", err.message);
  }

  if (address) return address;

  const near = nearestPlace(lat, lng, VALLEY_PLACES);
  return near && near.meters < 1500
    ? `Near ${near.place.name}`
    : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
};
