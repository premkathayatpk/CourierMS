import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { apiFetch } from "../../services/api";
import { createGpsKalmanFilter } from "../../services/algorithms/kalmanFilter";
import { DriverGpsContext } from "../../customeHook/useDriverGps";

// The tracking page polls every 4s, so sending GPS more often only adds load
const LOCATION_SYNC_INTERVAL_MS = 3000;

const GPS_ERRORS = {
  1: "Location permission denied. Allow location access in your browser to share your position.",
  2: "GPS signal unavailable. Move to an open area and try again.",
  3: "GPS is taking too long to respond. Retrying…",
};

// Shares the driver's position for the whole driver portal: automatically
// while they are online (so dispatch can auto-assign nearby parcels) or have
// active jobs. Stop/Share buttons override that until the next online toggle.
const DriverGpsProvider = ({ children }) => {
  const { user } = useSelector((state) => state.user);
  const isAvailable = user?.isAvailable !== false;

  const [jobsActive, setJobsActive] = useState(false);
  const [override, setOverride] = useState(null); // null | "on" | "off"
  const [sharing, setSharing] = useState(false);
  const [position, setPosition] = useState(null); // { lat, lng, accuracy, at }
  const [gpsError, setGpsError] = useState("");

  // Smooths jittery phone GPS before it is shown and sent to dispatch
  const kalmanRef = useRef(createGpsKalmanFilter());
  const lastSyncRef = useRef(0);
  const syncInFlightRef = useRef(false);

  const shouldShare = override === "off" ? false : override === "on" || isAvailable || jobsActive;

  // Going online/offline goes back to automatic sharing
  useEffect(() => {
    setOverride(null);
  }, [isAvailable]);

  // Send position to the server, throttled
  const syncLocation = useCallback(async (lat, lng) => {
    const now = Date.now();
    if (syncInFlightRef.current || now - lastSyncRef.current < LOCATION_SYNC_INTERVAL_MS) {
      return;
    }
    lastSyncRef.current = now;
    syncInFlightRef.current = true;
    try {
      await apiFetch("/user/driver/location", {
        method: "PATCH",
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
    } catch {
      setGpsError("Location found, but it couldn't be sent to dispatch. Retrying…");
    } finally {
      syncInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!shouldShare) {
      setSharing(false);
      return undefined;
    }
    if (!navigator.geolocation) {
      setGpsError("This browser doesn't support GPS location.");
      return undefined;
    }

    setGpsError("");
    kalmanRef.current.reset();
    lastSyncRef.current = 0;
    setSharing(true);
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const smoothed = kalmanRef.current.update({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        });
        setGpsError("");
        setPosition({ ...smoothed, at: new Date() });
        syncLocation(smoothed.lat, smoothed.lng);
      },
      (err) => {
        setGpsError(GPS_ERRORS[err.code] || "GPS error.");
        if (err.code === 1) setOverride("off");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [shouldShare, syncLocation]);

  const value = useMemo(
    () => ({
      sharing,
      position,
      gpsError,
      start: () => setOverride("on"),
      stop: () => setOverride("off"),
      setJobsActive,
    }),
    [sharing, position, gpsError],
  );

  return <DriverGpsContext.Provider value={value}>{children}</DriverGpsContext.Provider>;
};

export default DriverGpsProvider;
