import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { aStar } from "./algorithms/aStar.js";
import { haversineMeters } from "./algorithms/haversine.js";
import { SpatialGrid } from "./algorithms/spatialGrid.js";

// Road routing for the Kathmandu Valley using A* over the OpenStreetMap road
// graph in backend/data/road-graph.json (built by `npm run build:geo`).
//
// Graph: nodes are road junctions; each edge is a stretch of one road between
// two junctions with its full shape. Edge cost = length in metres, so A* finds
// the shortest route (main roads and small lanes alike), and one-way streets
// are only traversed in their legal direction. Travel time is estimated along
// the chosen route from each road type's typical speed.

const DATA_FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../data/road-graph.json",
);

// Points farther than this from any road can't be routed
const MAX_SNAP_METERS = 2000;
// Connector from the exact point to the road: walking/slow speed (m/s)
const CONNECTOR_SPEED = 4;

let graph = null;

const loadGraph = () => {
  const started = Date.now();
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  const scale = raw.coordScale;

  const nodeCount = raw.nodes.length / 2;
  const nodeLat = new Float64Array(nodeCount);
  const nodeLng = new Float64Array(nodeCount);
  for (let i = 0; i < nodeCount; i++) {
    nodeLat[i] = raw.nodes[2 * i] / scale;
    nodeLng[i] = raw.nodes[2 * i + 1] / scale;
  }

  const speeds = raw.speedClasses.map((c) => c.kmh / 3.6); // m/s
  const edgeCount = raw.edges.length / 7;
  const from = new Int32Array(edgeCount);
  const to = new Int32Array(edgeCount);
  const oneway = new Uint8Array(edgeCount);
  const speed = new Float64Array(edgeCount);
  const length = new Float64Array(edgeCount);
  // Full edge shapes (from node, interior points, to node) in shared arrays
  const shapeStart = new Int32Array(edgeCount + 1);
  const shapeLat = [];
  const shapeLng = [];

  for (let e = 0; e < edgeCount; e++) {
    const o = e * 7;
    from[e] = raw.edges[o];
    to[e] = raw.edges[o + 1];
    speed[e] = speeds[raw.edges[o + 3]];
    oneway[e] = raw.edges[o + 4];
    const geomStart = raw.edges[o + 5];
    const geomCount = raw.edges[o + 6];

    shapeStart[e] = shapeLat.length;
    let iLat = raw.nodes[2 * from[e]];
    let iLng = raw.nodes[2 * from[e] + 1];
    shapeLat.push(iLat / scale);
    shapeLng.push(iLng / scale);
    for (let k = 0; k < geomCount; k++) {
      iLat += raw.geometry[2 * (geomStart + k)];
      iLng += raw.geometry[2 * (geomStart + k) + 1];
      shapeLat.push(iLat / scale);
      shapeLng.push(iLng / scale);
    }
    shapeLat.push(nodeLat[to[e]]);
    shapeLng.push(nodeLng[to[e]]);
  }
  shapeStart[edgeCount] = shapeLat.length;
  const sLat = Float64Array.from(shapeLat);
  const sLng = Float64Array.from(shapeLng);

  // Edge lengths from the decoded shape (consistent with snapping offsets)
  for (let e = 0; e < edgeCount; e++) {
    let sum = 0;
    for (let k = shapeStart[e]; k < shapeStart[e + 1] - 1; k++) {
      sum += haversineMeters(sLat[k], sLng[k], sLat[k + 1], sLng[k + 1]);
    }
    length[e] = sum;
  }

  // Adjacency list in CSR form: for each node, the edges leaving it.
  // edgeRef = edge * 2 + (0 forward | 1 backward along a two-way road)
  const degree = new Int32Array(nodeCount + 1);
  for (let e = 0; e < edgeCount; e++) {
    degree[from[e]]++;
    if (!oneway[e]) degree[to[e]]++;
  }
  const adjStart = new Int32Array(nodeCount + 1);
  for (let i = 0; i < nodeCount; i++) adjStart[i + 1] = adjStart[i] + degree[i];
  const adj = new Int32Array(adjStart[nodeCount]);
  const fill = adjStart.slice(0, nodeCount);
  for (let e = 0; e < edgeCount; e++) {
    adj[fill[from[e]]++] = e * 2;
    if (!oneway[e]) adj[fill[to[e]]++] = e * 2 + 1;
  }

  // Spatial index of every road segment, for snapping points to the nearest road
  const grid = new SpatialGrid(0.004);
  const segEdge = new Int32Array(sLat.length);
  for (let e = 0; e < edgeCount; e++) {
    for (let k = shapeStart[e]; k < shapeStart[e + 1] - 1; k++) {
      segEdge[k] = e;
      grid.insert(
        k,
        Math.min(sLat[k], sLat[k + 1]),
        Math.min(sLng[k], sLng[k + 1]),
        Math.max(sLat[k], sLat[k + 1]),
        Math.max(sLng[k], sLng[k + 1]),
      );
    }
  }

  graph = {
    nodeCount, nodeLat, nodeLng, edgeCount, from, to, oneway, speed, length,
    shapeStart, sLat, sLng, adjStart, adj, grid, segEdge,
  };
  console.log(
    `Road graph loaded: ${nodeCount} junctions, ${edgeCount} roads (${Date.now() - started} ms)`,
  );
  return graph;
};

const getGraph = () => graph || loadGraph();

/** Closest point on segment k to (lat, lng), using a local flat projection. */
const projectOnSegment = (G, k, lat, lng) => {
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const ax = G.sLng[k] * cosLat, ay = G.sLat[k];
  const bx = G.sLng[k + 1] * cosLat, by = G.sLat[k + 1];
  const px = lng * cosLat, py = lat;
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  const pLat = G.sLat[k] + t * (G.sLat[k + 1] - G.sLat[k]);
  const pLng = G.sLng[k] + t * (G.sLng[k + 1] - G.sLng[k]);
  return { t, lat: pLat, lng: pLng, distance: haversineMeters(lat, lng, pLat, pLng) };
};

/**
 * Snap a point to the nearest road. Returns the edge, the exact point on it,
 * and `offset` = metres along the edge (from its "from" node) to that point.
 */
export const snapToRoad = (lat, lng) => {
  const G = getGraph();
  const hit = G.grid.nearest(lat, lng, (k) => projectOnSegment(G, k, lat, lng).distance, 8);
  if (!hit || hit.distance > MAX_SNAP_METERS) return null;

  const k = hit.item;
  const e = G.segEdge[k];
  const p = projectOnSegment(G, k, lat, lng);
  let offset = 0;
  for (let j = G.shapeStart[e]; j < k; j++) {
    offset += haversineMeters(G.sLat[j], G.sLng[j], G.sLat[j + 1], G.sLng[j + 1]);
  }
  offset += p.t * haversineMeters(G.sLat[k], G.sLng[k], G.sLat[k + 1], G.sLng[k + 1]);

  return { edge: e, seg: k, lat: p.lat, lng: p.lng, offset, distance: p.distance };
};

/** Points of edge e between two snap positions (or ends), in travel direction. */
const edgeSlice = (G, e, startSnap, endSnap, forward) => {
  const s = G.shapeStart[e];
  const last = G.shapeStart[e + 1] - 1;
  const pts = [];
  if (forward) {
    const a = startSnap ? startSnap.seg + 1 : s;
    const b = endSnap ? endSnap.seg : last;
    if (startSnap) pts.push([startSnap.lat, startSnap.lng]);
    for (let k = a; k <= b; k++) pts.push([G.sLat[k], G.sLng[k]]);
    if (endSnap) pts.push([endSnap.lat, endSnap.lng]);
  } else {
    const a = startSnap ? startSnap.seg : last;
    const b = endSnap ? endSnap.seg + 1 : s;
    if (startSnap) pts.push([startSnap.lat, startSnap.lng]);
    for (let k = a; k >= b; k--) pts.push([G.sLat[k], G.sLng[k]]);
    if (endSnap) pts.push([endSnap.lat, endSnap.lng]);
  }
  return pts;
};

const polylineMeters = (pts) => {
  let sum = 0;
  for (let i = 1; i < pts.length; i++) {
    sum += haversineMeters(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
  }
  return sum;
};

/**
 * Shortest road route between two points (A* on distance), with a travel-time estimate.
 * Returns { coordinates: [[lat,lng],...], distanceMeters, durationSeconds, expansions }
 * or null when either point is too far from any road / no route exists.
 */
export const findRoute = (fromLat, fromLng, toLat, toLng) => {
  const G = getGraph();
  const s = snapToRoad(fromLat, fromLng);
  const d = snapToRoad(toLat, toLng);
  if (!s || !d) return null;

  // Cost = metres, so A* finds the SHORTEST road route, small lanes included.
  // Travel time is estimated afterwards from each road's typical speed.

  // Entry points: drive from the snapped start to either end of its road
  // (only forwards on a one-way road).
  const sLen = G.length[s.edge];
  const sources = [{ node: G.to[s.edge], cost: sLen - s.offset }];
  if (!G.oneway[s.edge]) sources.push({ node: G.from[s.edge], cost: s.offset });

  // Exit points: reach either end of the destination road, then drive to the point.
  const dLen = G.length[d.edge];
  const targets = new Map([[G.from[d.edge], d.offset]]);
  if (!G.oneway[d.edge]) {
    const back = dLen - d.offset;
    const existing = targets.get(G.to[d.edge]);
    if (existing === undefined || back < existing) targets.set(G.to[d.edge], back);
  }

  // Heuristic: straight-line distance — a road can never be shorter than that,
  // so it never overestimates and A* stays optimal.
  const heuristic = (n) => haversineMeters(G.nodeLat[n], G.nodeLng[n], d.lat, d.lng);

  const expand = (u, relax) => {
    for (let i = G.adjStart[u]; i < G.adjStart[u + 1]; i++) {
      const ref = G.adj[i];
      const e = ref >> 1;
      const v = ref & 1 ? G.from[e] : G.to[e];
      relax(v, G.length[e], ref);
    }
  };

  const result = aStar({ nodeCount: G.nodeCount, sources, targets, heuristic, expand, maxExpansions: 400000 });

  // Start and destination on the same road: driving straight along it may be best
  let direct = null;
  if (s.edge === d.edge) {
    const forwardOk = d.offset >= s.offset;
    if (forwardOk || !G.oneway[s.edge]) {
      direct = { cost: Math.abs(d.offset - s.offset), forward: forwardOk };
    }
  }

  let road;
  let travelSeconds;
  if (direct && (!result || direct.cost <= result.cost)) {
    road = edgeSlice(G, s.edge, s, d, direct.forward);
    travelSeconds = direct.cost / G.speed[s.edge];
  } else if (result) {
    // First partial road: from the snapped start towards the entry node
    const entry = result.nodes[0];
    const startForward = entry === G.to[s.edge];
    road = edgeSlice(G, s.edge, s, null, startForward);
    travelSeconds = (startForward ? sLen - s.offset : s.offset) / G.speed[s.edge];
    for (const ref of result.edges) {
      const e = ref >> 1;
      const pts = edgeSlice(G, e, null, null, (ref & 1) === 0);
      road.push(...pts.slice(1)); // skip the shared junction point
      travelSeconds += G.length[e] / G.speed[e];
    }
    // Last partial road: from the exit node to the snapped destination
    const exit = result.nodes[result.nodes.length - 1];
    const endForward = exit === G.from[d.edge];
    const tail = endForward
      ? edgeSlice(G, d.edge, null, d, true)
      : edgeSlice(G, d.edge, null, d, false);
    road.push(...tail.slice(1));
    travelSeconds += (endForward ? d.offset : dLen - d.offset) / G.speed[d.edge];
  } else {
    return null;
  }

  // Short connectors from the exact points to the road
  const coordinates = [[fromLat, fromLng], ...road, [toLat, toLng]];
  const connectorMeters = s.distance + d.distance;

  return {
    coordinates: coordinates.map(([lat, lng]) => [+lat.toFixed(6), +lng.toFixed(6)]),
    distanceMeters: Math.round(polylineMeters(road) + connectorMeters),
    durationSeconds: Math.round(travelSeconds + connectorMeters / CONNECTOR_SPEED),
    expansions: result?.expansions ?? 0,
  };
};

/** Load the graph at startup instead of on the first request. */
export const warmUpRouter = () => {
  try {
    getGraph();
  } catch (err) {
    console.error(`Road graph unavailable (${err.message}). Run "npm run build:geo".`);
  }
};
