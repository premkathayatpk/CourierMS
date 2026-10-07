// One-time data build for the Kathmandu Valley service area.
//
//   npm run build:geo
//
// Downloads from OpenStreetMap (ODbL) and writes to backend/data/:
//   valley-boundary.json  district outlines of Kathmandu, Lalitpur, Bhaktapur
//   road-graph.json       drivable road network used by the A* router
//
// Re-run occasionally to pick up new roads. Takes a minute or two.
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../data");
const USER_AGENT = "CourierMS-geo-build/1.0 (https://github.com/)";

// OSM administrative relations (admin_level 6 = district)
const DISTRICTS = [
  { name: "Kathmandu", relation: 4583247 },
  { name: "Lalitpur", relation: 4583253 },
  { name: "Bhaktapur", relation: 4583251 },
];

// Road types a bike/car courier can use, with typical Kathmandu speeds (km/h)
export const ROAD_SPEEDS_KMH = {
  motorway: 50, trunk: 35, primary: 30, secondary: 25, tertiary: 22,
  unclassified: 18, residential: 15, living_street: 10,
  motorway_link: 35, trunk_link: 25, primary_link: 22, secondary_link: 20, tertiary_link: 18,
};

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const overpass = async (query) => {
  for (let attempt = 0; attempt < 6; attempt++) {
    const url = OVERPASS_ENDPOINTS[attempt % OVERPASS_ENDPOINTS.length];
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "User-Agent": USER_AGENT, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: query }),
      });
      const text = await res.text();
      if (res.ok && text.startsWith("{")) return JSON.parse(text);
      console.warn(`  ${url} busy (${res.status}), retrying…`);
    } catch (err) {
      console.warn(`  ${url} failed: ${err.message}`);
    }
    await sleep(3000 * (attempt + 1));
  }
  throw new Error("Overpass API unavailable, try again later.");
};

const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

// ---------- 1. District boundaries ----------
const buildBoundary = async () => {
  console.log("Downloading district boundaries…");
  const ids = DISTRICTS.map((d) => `R${d.relation}`).join(",");
  // polygon_threshold simplifies the outline server-side (~20 m tolerance)
  const url = `https://nominatim.openstreetmap.org/lookup?osm_ids=${ids}&format=json&polygon_geojson=1&polygon_threshold=0.0002`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Nominatim lookup failed: ${res.status}`);
  const places = await res.json();

  const features = DISTRICTS.map((d) => {
    const place = places.find((p) => Number(p.osm_id) === d.relation);
    if (!place?.geojson) throw new Error(`No boundary for ${d.name}`);
    const round = (ring) => ring.map(([lng, lat]) => [+lng.toFixed(5), +lat.toFixed(5)]);
    const geometry =
      place.geojson.type === "Polygon"
        ? { type: "Polygon", coordinates: place.geojson.coordinates.map(round) }
        : { type: "MultiPolygon", coordinates: place.geojson.coordinates.map((poly) => poly.map(round)) };
    return { type: "Feature", properties: { name: d.name }, geometry };
  });

  // Overall bounding box (used to bound road download and geocoding)
  let [minLat, minLng, maxLat, maxLng] = [90, 180, -90, -180];
  for (const f of features) {
    const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const poly of polys) for (const [lng, lat] of poly[0]) {
      minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng);
    }
  }
  const bbox = [minLat, minLng, maxLat, maxLng].map((v) => +v.toFixed(5));
  const boundary = { type: "FeatureCollection", bbox, features };
  await fs.writeFile(path.join(DATA_DIR, "valley-boundary.json"), JSON.stringify(boundary));
  const points = features.reduce((n, f) => n + JSON.stringify(f.geometry.coordinates).split("],[").length, 0);
  console.log(`  ${features.length} districts, ~${points} outline points, bbox ${bbox.join(",")}`);
  return bbox;
};

// ---------- 2. Road graph ----------
const buildRoadGraph = async ([minLat, minLng, maxLat, maxLng]) => {
  console.log("Downloading road network (this is the slow part)…");
  const types = Object.keys(ROAD_SPEEDS_KMH).join("|");
  const query = `[out:json][timeout:300];
    way["highway"~"^(${types})$"]["access"!~"^(no|private)$"]["area"!="yes"](${minLat},${minLng},${maxLat},${maxLng});
    out body qt;
    >;
    out skel qt;`;
  // GEO_CACHE=<file> reuses a previous download while developing this script
  let osm;
  const cache = process.env.GEO_CACHE;
  if (cache && (await fs.stat(cache).catch(() => null))) {
    osm = JSON.parse(await fs.readFile(cache, "utf8"));
  } else {
    osm = await overpass(query);
    if (cache) await fs.writeFile(cache, JSON.stringify(osm));
  }

  const coords = new Map(); // osm node id -> [lat, lng]
  // Overpass lists ways before their nodes, so collect coordinates first
  for (const el of osm.elements) {
    if (el.type === "node") coords.set(el.id, [el.lat, el.lon]);
  }
  const ways = osm.elements
    .filter((el) => el.type === "way")
    .map((el) => ({ ...el, nodes: el.nodes.filter((n) => coords.has(n)) }));
  console.log(`  ${ways.length} ways, ${coords.size} nodes downloaded`);

  // --- Graph contraction: only junctions become graph nodes. A node is a
  // junction if it is a way endpoint or is shared by more than one way.
  // Everything between two junctions on one way becomes a single edge whose
  // road shape is kept as geometry for drawing.
  const useCount = new Map();
  for (const way of ways) {
    for (const n of new Set(way.nodes)) useCount.set(n, (useCount.get(n) || 0) + 1);
  }
  const isJunction = (way, k) => k === 0 || k === way.nodes.length - 1 || useCount.get(way.nodes[k]) > 1;

  const speedClasses = Object.keys(ROAD_SPEEDS_KMH);
  const junctionIndex = new Map(); // osm id -> junction index
  const junctions = [];
  const jIdx = (osmId) => {
    let i = junctionIndex.get(osmId);
    if (i === undefined) {
      i = junctions.length;
      junctionIndex.set(osmId, i);
      junctions.push(coords.get(osmId));
    }
    return i;
  };

  // raw edge: { a, b, meters, speedClass, oneway, shape: [[lat,lng], ...] (interior points only) }
  const rawEdges = [];
  for (const way of ways) {
    if (way.nodes.length < 2) continue;
    const tags = way.tags || {};
    const ow = tags.oneway;
    const oneway = ow === "yes" || ow === "true" || ow === "1" || tags.junction === "roundabout";
    const reverse = ow === "-1";
    const nodes = reverse ? [...way.nodes].reverse() : way.nodes;
    const speedClass = speedClasses.indexOf(tags.highway);

    let startK = 0;
    let meters = 0;
    for (let k = 1; k < nodes.length; k++) {
      const [lat1, lng1] = coords.get(nodes[k - 1]);
      const [lat2, lng2] = coords.get(nodes[k]);
      meters += haversine(lat1, lng1, lat2, lng2);
      if (isJunction({ nodes }, k)) {
        if (meters > 0.05) {
          rawEdges.push({
            a: jIdx(nodes[startK]),
            b: jIdx(nodes[k]),
            meters,
            speedClass,
            oneway: oneway || reverse,
            shape: nodes.slice(startK + 1, k).map((n) => coords.get(n)),
          });
        }
        startK = k;
        meters = 0;
      }
    }
  }

  // Keep only the largest connected component (union-find), so the router
  // never snaps a point onto an isolated road fragment.
  const parent = Int32Array.from(junctions, (_, i) => i);
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  for (const e of rawEdges) { const ra = find(e.a), rb = find(e.b); if (ra !== rb) parent[ra] = rb; }
  const sizes = new Map();
  for (let i = 0; i < junctions.length; i++) { const r = find(i); sizes.set(r, (sizes.get(r) || 0) + 1); }
  const main = [...sizes.entries()].sort((x, y) => y[1] - x[1])[0][0];

  const remap = new Int32Array(junctions.length).fill(-1);
  const nodes = [];
  for (let i = 0; i < junctions.length; i++) {
    if (find(i) === main) {
      remap[i] = nodes.length / 2;
      nodes.push(Math.round(junctions[i][0] * 1e5), Math.round(junctions[i][1] * 1e5));
    }
  }

  // Edge geometry is delta-encoded (integer lat/lng * 1e5 relative to the
  // previous point, starting from the edge's "from" node) to keep the file small.
  const edges = [];
  const geometry = [];
  for (const e of rawEdges) {
    if (remap[e.a] < 0) continue;
    const from = remap[e.a];
    let prevLat = nodes[from * 2];
    let prevLng = nodes[from * 2 + 1];
    const geomStart = geometry.length / 2;
    for (const [lat, lng] of e.shape) {
      const iLat = Math.round(lat * 1e5);
      const iLng = Math.round(lng * 1e5);
      geometry.push(iLat - prevLat, iLng - prevLng);
      prevLat = iLat;
      prevLng = iLng;
    }
    edges.push(from, remap[e.b], Math.round(e.meters * 10) / 10, e.speedClass, e.oneway ? 1 : 0, geomStart, e.shape.length);
  }

  const graph = {
    source: "OpenStreetMap contributors (ODbL)",
    builtAt: new Date().toISOString(),
    coordScale: 1e5, // coordinates are integers: lat*1e5, lng*1e5
    speedClasses: speedClasses.map((name) => ({ name, kmh: ROAD_SPEEDS_KMH[name] })),
    nodes, // junctions, flat [lat0, lng0, lat1, lng1, ...]
    edges, // flat [from, to, meters, speedClass, oneway, geomStart, geomCount, ...]
    geometry, // delta-encoded interior shape points, flat [dLat, dLng, ...]
  };
  const json = JSON.stringify(graph);
  await fs.writeFile(path.join(DATA_DIR, "road-graph.json"), json);
  console.log(
    `  graph: ${nodes.length / 2} junctions, ${edges.length / 7} edges, ${geometry.length / 2} shape points (${Math.round(json.length / 1024)} KB)`,
  );
};

const run = async () => {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const bbox = await buildBoundary();
  await buildRoadGraph(bbox);
  console.log("Done. Restart the backend to load the new data.");
};

run().catch((err) => {
  console.error("Geo build failed:", process.env.DEBUG ? err.stack : err.message);
  process.exit(1);
});
