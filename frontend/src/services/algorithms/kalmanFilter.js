
export const createGpsKalmanFilter = ({ processNoise = 3, minAccuracy = 1 } = {}) => {
  let lat = null;
  let lng = null;
  let variance = -1; // negative = not initialised
  let lastTime = 0;

  const reset = () => {
    variance = -1;
  };

 
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
