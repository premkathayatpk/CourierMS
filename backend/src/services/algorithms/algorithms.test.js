// Unit tests for the pure algorithms (no DB/network). Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import { haversineMeters } from "./haversine.js";
import { MinHeap } from "./priorityQueue.js";
import { SpatialGrid } from "./spatialGrid.js";
import { aStar } from "./aStar.js";
import { pointInPolygon, prepareFeatures, findContainingFeature } from "./geofence.js";
import { normalizeAddress, scorePlaceMatch, rankAndDedupe, nearestPlace } from "./addressResolution.js";

test("haversine: known distances", () => {
  assert.equal(haversineMeters(27.7, 85.3, 27.7, 85.3), 0);
  // 1 degree of latitude ≈ 111.2 km
  assert.ok(Math.abs(haversineMeters(27, 85, 28, 85) - 111195) < 50);
  // Thamel -> Patan Durbar Square ≈ 4.8 km straight line
  const d = haversineMeters(27.7154, 85.3123, 27.6728, 85.3252);
  assert.ok(d > 4500 && d < 5100, String(d));
});

test("min-heap pops in priority order", () => {
  const h = new MinHeap();
  [5, 1, 4, 2, 3, 0].forEach((p) => h.push(p * 10, p));
  const out = [];
  while (h.size) out.push(h.pop());
  assert.deepEqual(out, [0, 10, 20, 30, 40, 50]);
  assert.equal(h.pop(), undefined);
});

test("spatial grid finds the true nearest item", () => {
  const pts = Array.from({ length: 500 }, (_, i) => ({ lat: 27.6 + (i % 25) * 0.01, lng: 85.2 + Math.floor(i / 25) * 0.01 }));
  const grid = new SpatialGrid(0.005);
  pts.forEach((p, i) => grid.insert(i, p.lat, p.lng));
  const q = { lat: 27.7333, lng: 85.3141 };
  const dist = (i) => haversineMeters(q.lat, q.lng, pts[i].lat, pts[i].lng);
  const brute = pts.map((_, i) => i).sort((a, b) => dist(a) - dist(b))[0];
  assert.equal(grid.nearest(q.lat, q.lng, dist).item, brute);
});

// Small grid graph:  0 -1- 1 -1- 2
//                    |           |
//                    5           1
//                    |           |
//                    3 ---10---- 4
const smallGraph = () => {
  const coords = [[0, 0], [0, 1], [0, 2], [1, 0], [1, 2]];
  const edges = { 0: [[1, 1], [3, 5]], 1: [[0, 1], [2, 1]], 2: [[1, 1], [4, 1]], 3: [[0, 5], [4, 10]], 4: [[2, 1], [3, 10]] };
  return { coords, edges };
};

test("A* finds the cheapest path, not the fewest hops", () => {
  const { coords, edges } = smallGraph();
  const goal = 3;
  const r = aStar({
    nodeCount: 5,
    sources: [{ node: 4, cost: 0 }],
    targets: new Map([[goal, 0]]),
    // straight-line (grid) distance never exceeds the real cost here
    heuristic: (n) => Math.hypot(coords[n][0] - coords[goal][0], coords[n][1] - coords[goal][1]),
    expand: (u, relax) => edges[u].forEach(([v, c]) => relax(v, c, v)),
  });
  // 4->2->1->0->3 costs 8, the direct 4->3 edge costs 10
  assert.equal(r.cost, 8);
  assert.deepEqual(r.nodes, [4, 2, 1, 0, 3]);
});

test("A* respects source/target extra costs and unreachable goals", () => {
  const { edges } = smallGraph();
  const expand = (u, relax) => edges[u].forEach(([v, c]) => relax(v, c, v));
  const r = aStar({
    nodeCount: 5,
    sources: [{ node: 0, cost: 2 }, { node: 2, cost: 0 }],
    targets: new Map([[3, 1], [4, 7]]),
    heuristic: () => 0,
    expand,
  });
  // best: start at 2 (0) -> 4 (1) then exit cost 7 = 8, vs start 0 (2) -> 3 (5) + 1 = 8; tie → cost 8
  assert.equal(r.cost, 8);
  const none = aStar({ nodeCount: 5, sources: [{ node: 0, cost: 0 }], targets: new Map([[4, 0]]), heuristic: () => 0, expand: () => {} });
  assert.equal(none, null);
});

test("geofence: point in polygon with hole", () => {
  const square = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
  const hole = [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]];
  assert.equal(pointInPolygon(1, 1, [square]), true);
  assert.equal(pointInPolygon(11, 1, [square]), false);
  assert.equal(pointInPolygon(5, 5, [square, hole]), false);
  const features = prepareFeatures({
    features: [{ properties: { name: "A" }, geometry: { type: "Polygon", coordinates: [square] } }],
  });
  assert.equal(findContainingFeature(2, 3, features), "A"); // (lat=2, lng=3)
  assert.equal(findContainingFeature(20, 3, features), null);
});

test("address normalization and matching", () => {
  assert.equal(normalizeAddress("  Pulchowk Rd., LTP "), "pulchowk road lalitpur");
  assert.equal(scorePlaceMatch("thamel, kathmandu", "Thamel, Kathmandu"), 100);
  assert.equal(scorePlaceMatch("thamel", "Thamel, Kathmandu"), 85);
  assert.equal(scorePlaceMatch("durbar patan", "Patan Durbar Square, Lalitpur"), 70);
  assert.equal(scorePlaceMatch("bhak dur", "Bhaktapur Durbar Square"), 55);
  assert.equal(scorePlaceMatch("pokhara", "Thamel, Kathmandu"), 0);
});

test("rank & dedupe keeps the best of near-duplicates and drops outside points", () => {
  const out = rankAndDedupe(
    [
      { name: "A low", lat: 27.7, lng: 85.3, score: 40 },
      { name: "A high", lat: 27.7003, lng: 85.3, score: 90 }, // ~33 m away
      { name: "B", lat: 27.6, lng: 85.3, score: 60 },
      { name: "Outside", lat: 28.2, lng: 83.9, score: 99 },
    ],
    { isInside: (lat) => lat < 28 },
  );
  assert.deepEqual(out.map((r) => r.name), ["A high", "B"]);
  assert.equal(nearestPlace(27.61, 85.3, out).place.name, "B");
});

test("driver assignment: road time + workload penalty, skips full/no-GPS/stale/too-small drivers", async () => {
  const { pickBestDriver, MAX_ACTIVE_JOBS, canCarry } = await import("./driverAssignment.js");
  const now = Date.parse("2026-10-07T10:00:00Z");
  const fresh = new Date(now - 60 * 1000);
  const at = (id, lat, lng, extra = {}) => ({
    _id: id,
    vehicleType: "Car",
    currentLocation: { latitude: lat, longitude: lng },
    locationUpdatedAt: fresh,
    ...extra,
  });
  const pickup = { lat: 27.7, lng: 85.3 };
  const base = { pickup, weightKg: 2, now };
  // Fake router: travel seconds = straight-line metres × 0.01
  const route = (a, b, c, d) => ({ durationSeconds: haversineMeters(a, b, c, d) * 0.01 });
  const near = at("near", 27.701, 85.3); // ~111 m
  const far = at("far", 27.71, 85.3); // ~1.1 km
  const noGps = at("x", null, null);

  // Nearest wins when idle
  let r = pickBestDriver({ ...base, drivers: [far, near, noGps], activeJobs: new Map(), route });
  assert.equal(r.driver._id, "near");

  // Busy near driver loses to an idle one once the penalty outweighs the extra travel
  r = pickBestDriver({ ...base, drivers: [far, near], activeJobs: new Map([["near", 2]]), route });
  assert.equal(r.driver._id, "far");

  // Drivers at the cap are skipped entirely
  r = pickBestDriver({ ...base, drivers: [near], activeJobs: new Map([["near", MAX_ACTIVE_JOBS]]), route });
  assert.equal(r, null);

  // Stale or missing GPS timestamp -> skipped
  const stale = at("stale", 27.7001, 85.3, { locationUpdatedAt: new Date(now - 60 * 60 * 1000) });
  const never = at("never", 27.7001, 85.3, { locationUpdatedAt: null });
  r = pickBestDriver({ ...base, drivers: [stale, never, far], activeJobs: new Map(), route });
  assert.equal(r.driver._id, "far");

  // Vehicle capacity: a bike can't take 50 kg even if it is closest
  const bike = at("bike", 27.7001, 85.3, { vehicleType: "Bike" });
  r = pickBestDriver({ ...base, weightKg: 50, drivers: [bike, far], activeJobs: new Map(), route });
  assert.equal(r.driver._id, "far");
  assert.ok(canCarry("Bike", 20) && !canCarry("Bike", 21) && canCarry("Truck", 1000));
  assert.ok(!canCarry(undefined, 50)); // unknown vehicle counts as a bike

  // No route -> haversine fallback still picks someone
  r = pickBestDriver({ ...base, drivers: [near], activeJobs: new Map(), route: () => null });
  assert.equal(r.driver._id, "near");
  assert.ok(r.travelSeconds > 0);

  assert.equal(pickBestDriver({ ...base, drivers: [noGps], activeJobs: new Map(), route }), null);
});
