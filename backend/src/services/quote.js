import { haversineMeters } from "./algorithms/haversine.js";
import { calculateDeliveryCost } from "./pricing.js";
import { PRICING } from "../config/pricing.js";
import { findRoute } from "./roadRouter.js";
import { SERVICE_AREA_NAME, districtAt } from "./serviceArea.js";

export class QuoteError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

/**
 * Validate both points are inside the service area, find the road route with
 * A*, and price the delivery from road distance + weight + parcel type.
 * Throws QuoteError for invalid input / outside the valley.
 */
export const quoteDelivery = ({ pickup, delivery, weightKg, parcelType }) => {
  for (const [label, point] of [["Pickup", pickup], ["Delivery", delivery]]) {
    if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lng)) {
      throw new QuoteError(`${label} location is missing. Choose it on the map or from the suggestions.`);
    }
  }

  const pickupDistrict = districtAt(pickup.lat, pickup.lng);
  const deliveryDistrict = districtAt(delivery.lat, delivery.lng);
  if (!pickupDistrict) throw new QuoteError(`Pickup must be inside ${SERVICE_AREA_NAME}.`);
  if (!deliveryDistrict) throw new QuoteError(`Delivery must be inside ${SERVICE_AREA_NAME}.`);

  const route = findRoute(pickup.lat, pickup.lng, delivery.lat, delivery.lng);
  // If no road route can be found, approximate with straight line x detour factor
  const distanceMeters =
    route?.distanceMeters ??
    haversineMeters(pickup.lat, pickup.lng, delivery.lat, delivery.lng) * PRICING.detourFactor;

  const cost = calculateDeliveryCost({ distanceMeters, weightKg, parcelType });

  return {
    ...cost,
    durationMinutes: route ? Math.max(1, Math.round(route.durationSeconds / 60)) : null,
    routed: Boolean(route),
    pickupDistrict,
    deliveryDistrict,
  };
};
