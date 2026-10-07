/**
 * Delivery cost estimation — distance + weight based pricing.
 *
 *   distanceCharge = perKm × roadKm
 *   weightCharge   = perKg × max(0, weightKg − freeWeightKg)
 *   total          = max(minimumFare, baseFare + distanceCharge + weightCharge + typeSurcharge)
 *
 * Road distance comes from the A* router, so a parcel across the river costs
 * what the actual drive costs, not the straight-line distance. Every component
 * is returned so the customer sees exactly how the price was built.
 * Time: O(1).
 *
 * Rates live in src/config/pricing.js.
 */
import { PRICING } from "../config/pricing.js";

const roundRs = (n) => Math.round(n);

/**
 * @param {object} p
 * @param {number} p.distanceMeters  road distance
 * @param {number} p.weightKg
 * @param {string} p.parcelType
 * @param {object} [config]  defaults to PRICING
 */
export const calculateDeliveryCost = (
  { distanceMeters, weightKg, parcelType },
  config = PRICING,
) => {
  const distanceKm = Math.max(0, distanceMeters) / 1000;
  const chargeableKg = Math.max(0, weightKg - config.freeWeightKg);

  const base = config.baseFare;
  const distance = roundRs(distanceKm * config.perKm);
  const weight = roundRs(chargeableKg * config.perKg);
  const surcharge = config.typeSurcharge[parcelType] || 0;

  const subtotal = base + distance + weight + surcharge;
  const total = Math.max(config.minimumFare, subtotal);

  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    breakdown: {
      base,
      distance,
      weight,
      surcharge,
      minimumFareAdjustment: total - subtotal,
    },
    total,
  };
};
