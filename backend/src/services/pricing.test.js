// Unit test for the pricing formula (pure, no DB). Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import { calculateDeliveryCost } from "./pricing.js";

test("pricing: distance + weight + surcharge, with minimum fare", () => {
  const config = { baseFare: 80, perKm: 20, perKg: 15, freeWeightKg: 1, minimumFare: 100, typeSurcharge: { Fragile: 100 } };
  const q = calculateDeliveryCost({ distanceMeters: 6200, weightKg: 3, parcelType: "Fragile" }, config);
  assert.deepEqual(q.breakdown, { base: 80, distance: 124, weight: 30, surcharge: 100, minimumFareAdjustment: 0 });
  assert.equal(q.total, 334);
  assert.equal(q.distanceKm, 6.2);
  const tiny = calculateDeliveryCost({ distanceMeters: 300, weightKg: 0.5, parcelType: "Document" }, config);
  assert.equal(tiny.total, 100); // 80 + 6 = 86 -> minimum fare
  assert.equal(tiny.breakdown.minimumFareAdjustment, 14);
});

