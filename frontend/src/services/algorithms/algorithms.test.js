// Unit tests for browser-side algorithm services. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { createGpsKalmanFilter } from "./kalmanFilter.js";
import { distanceMeters } from "./haversine.js";

test("Kalman filter smooths GPS noise around a fixed point", () => {
  const truth = { lat: 27.7154, lng: 85.3123 };
  const kf = createGpsKalmanFilter({ processNoise: 1 });
  // Deterministic "noise": readings scattered ~20 m around the true point
  const offsets = [0.0002, -0.00018, 0.00015, -0.0002, 0.00019, -0.00016, 0.00017, -0.00019];
  let raw = 0;
  let out;
  offsets.forEach((o, i) => {
    const reading = { lat: truth.lat + o, lng: truth.lng - o, accuracy: 20, timestamp: i * 1000 };
    raw += distanceMeters(truth, reading);
    out = kf.update(reading);
  });
  const avgRawError = raw / offsets.length;
  const filteredError = distanceMeters(truth, out);
  assert.ok(filteredError < avgRawError / 2, `filtered ${filteredError} vs raw ${avgRawError}`);
});

test("Kalman filter trusts precise readings and follows real movement", () => {
  const kf = createGpsKalmanFilter({ processNoise: 3 });
  kf.update({ lat: 27.7, lng: 85.3, accuracy: 30, timestamp: 0 });
  // A very accurate reading 10 s later should pull the estimate almost all the way
  const out = kf.update({ lat: 27.701, lng: 85.3, accuracy: 3, timestamp: 10000 });
  assert.ok(distanceMeters(out, { lat: 27.701, lng: 85.3 }) < 5);
  kf.reset();
  const first = kf.update({ lat: 1, lng: 2, accuracy: 10 });
  assert.deepEqual([first.lat, first.lng], [1, 2]);
});

test("haversine distance", () => {
  const d = distanceMeters({ lat: 27.7154, lng: 85.3123 }, { lat: 27.6728, lng: 85.3252 });
  assert.ok(d > 4500 && d < 5100, String(d));
});
