// Delivery pricing (Nepalese rupees). Edit these numbers to change prices;
// the formula lives in src/services/pricing.js.
export const PRICING = {
  baseFare: 80, // every delivery
  perKm: 20, // per kilometre of road distance (A* route)
  perKg: 15, // per kilogram above the free allowance
  freeWeightKg: 1, // first kilogram included in the base fare
  minimumFare: 100,
  // Extra handling charge by parcel type
  typeSurcharge: {
    Fragile: 100,
    Electronics: 50,
  },
  // When no road route can be computed, straight-line distance x this factor
  // approximates the road distance (city roads are ~30% longer).
  detourFactor: 1.3,
};
