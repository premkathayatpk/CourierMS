
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
