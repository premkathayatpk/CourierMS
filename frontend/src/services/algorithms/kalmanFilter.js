/**
 * GPS smoothing with a Kalman filter.
 *
 * Phone GPS readings jump around by 5–50 m even when standing still. A Kalman
 * filter keeps a best estimate of the true position plus how uncertain that
 * estimate is (variance, in m²), and blends each new reading in proportion to
 * how much it trusts it:
 *
 *   predict:  variance += Δt · q²             (we may have moved since last time)
 *   gain:     K = variance / (variance + r²)  (r = reported GPS accuracy, m)
 *   update:   position += K · (measurement − position)
 *             variance  = (1 − K) · variance
 *
 * Precise readings (small r) move the estimate a lot; noisy ones barely move
 * it. q is the expected movement speed in m/s: higher = follows real movement
 * faster, lower = smoother. Latitude and longitude are filtered independently
 * with a shared variance (a common simplification for GPS).
 * Time: O(1) per reading.
 *
 * Used by: the driver's live navigation page before showing and sending the
 * courier's position.
 */
export const createGpsKalmanFilter = ({ processNoise = 3, minAccuracy = 1 } = {}) => {
  let lat = null;
  let lng = null;
  let variance = -1; // negative = not initialised
  let lastTime = 0;

  const reset = () => {
    variance = -1;
  };

  /**
   * Feed one GPS reading. `accuracy` is the device-reported radius in metres.
   * Returns the smoothed { lat, lng, accuracy }.
   */
  const update = ({ lat: mLat, lng: mLng, accuracy, timestamp = Date.now() }) => {
    const r = Math.max(accuracy || minAccuracy, minAccuracy);

    if (variance < 0) {
      lat = mLat;
      lng = mLng;
      variance = r * r;
      lastTime = timestamp;
    } else {
      const dt = Math.max(0, (timestamp - lastTime) / 1000);
      lastTime = timestamp;
      variance += dt * processNoise * processNoise;

      const k = variance / (variance + r * r);
      lat += k * (mLat - lat);
      lng += k * (mLng - lng);
      variance *= 1 - k;
    }

    return { lat, lng, accuracy: Math.round(Math.sqrt(variance)) };
  };

  return { update, reset };
};
