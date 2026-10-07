import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../../services/api";
import DeliveryMap from "../../components/common/DeliveryMap";
import {
  Search,
  Package,
  MapPin,
  Truck,
  CheckCircle,
  Phone,
  ArrowRight,
  AlertCircle,
  RotateCw,
  Navigation,
} from "lucide-react";

const TrackParcel = () => {
  const { id: routeTrackingParam } = useParams();
  const navigate = useNavigate();

  const [trackingInput, setTrackingInput] = useState(routeTrackingParam || "");
  const [parcel, setParcel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Live Auto-Polling state
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const pollIntervalRef = useRef(null);

  const fetchTracking = async (trkNum, isBackground = false) => {
    if (!trkNum) return;
    if (!isBackground) setLoading(true);
    else setSyncing(true);
    setError("");

    try {
      const res = await apiFetch(
        `/parcel/track/${encodeURIComponent(trkNum.trim())}`,
      );
      if (res.success && res.data) {
        setParcel(res.data);
        setLastSyncTime(new Date());
      } else {
        if (!isBackground) {
          setError(
            res.message || "Parcel not found with this tracking number.",
          );
          setParcel(null);
        }
      }
    } catch (err) {
      if (!isBackground) {
        setError(
          err.message || "Failed to find parcel with this tracking number.",
        );
        setParcel(null);
      }
    } finally {
      if (!isBackground) setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (routeTrackingParam) {
      setTrackingInput(routeTrackingParam);
      fetchTracking(routeTrackingParam);
    }
  }, [routeTrackingParam]);

  const activeTrackingNumber =
    parcel && ["Assigned", "Picked Up", "In Transit"].includes(parcel.status)
      ? parcel.trackingNumber
      : null;

  // Refresh active deliveries every four seconds.
  useEffect(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    if (activeTrackingNumber) {
      pollIntervalRef.current = setInterval(() => {
        // Don't poll from background tabs
        if (document.visibilityState === "visible") {
          fetchTracking(activeTrackingNumber, true);
        }
      }, 4000);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [activeTrackingNumber]);

  const openTracking = (trackingNumber) => {
    const normalizedTrackingNumber = trackingNumber.trim();
    if (!normalizedTrackingNumber) return;

    setTrackingInput(normalizedTrackingNumber);
    if (normalizedTrackingNumber === routeTrackingParam) {
      fetchTracking(normalizedTrackingNumber);
      return;
    }
    navigate(`/track/${encodeURIComponent(normalizedTrackingNumber)}`);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    openTracking(trackingInput);
  };

  const steps = ["Pending", "Assigned", "Picked Up", "In Transit", "Delivered"];
  const currentStep = parcel
    ? parcel.status === "Cancelled"
      ? -1
      : steps.indexOf(parcel.status)
    : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-5 py-4 sm:py-6">
      <section className="border-b border-ink-200 pb-6">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-brand-700">
          <Package className="h-4 w-4" /> Parcel tracking
        </div>
        <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">
          Track a parcel
        </h1>
        <p className="mt-1 mb-5 text-sm text-ink-500">
          Enter a tracking number to see its status, route, and courier details.
        </p>

        {/* Tracking Search Input Form */}
        <form onSubmit={handleSearchSubmit} className="flex max-w-2xl gap-2">
          <label htmlFor="tracking-number" className="sr-only">
            Tracking number
          </label>
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-ink-500" />
            <input
              id="tracking-number"
              type="text"
              placeholder="Tracking number"
              value={trackingInput}
              onChange={(e) => setTrackingInput(e.target.value)}
              className="w-full rounded-md border border-ink-300 bg-white py-2.5 pl-9 pr-3 text-sm text-ink-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex shrink-0 items-center gap-2 rounded-md bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700 disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? "Searching..." : "Track"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* Demo Tracking Chips */}
        {!parcel && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-500">
            <span>Sample numbers:</span>
            {["TRK-DEMO-001", "TRK-DEMO-002", "TRK-DEMO-003"].map((demo) => (
              <button
                key={demo}
                type="button"
                onClick={() => openTracking(demo)}
                className="rounded border border-ink-300 bg-white px-2 py-1 font-mono text-ink-600 transition hover:border-brand-500 hover:text-brand-700"
              >
                {demo}
              </button>
            ))}
          </div>
        )}
      </section>

      {error && (
        <div
          role="alert"
          className="flex max-w-2xl items-center gap-3 rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tracking Results View */}
      {parcel && (
        <div className="space-y-5">
          {/* Top Status & Summary Bar */}
          <div className="flex flex-col items-start justify-between gap-4 rounded-md border border-ink-200 bg-white p-4 sm:p-5 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase text-ink-500">
                  Tracking Number
                </span>
                {/* Live Auto-Polling Beacon */}
                {["Assigned", "Picked Up", "In Transit"].includes(
                  parcel.status,
                ) && (
                  <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-700" />
                    Live updates
                  </span>
                )}
              </div>
              <h2 className="mt-0.5 font-mono text-xl font-bold text-ink-900 sm:text-2xl">
                {parcel.trackingNumber}
              </h2>
              <p className="mt-1 text-xs text-ink-500">
                {parcel.parcelType} · {parcel.weight} kg · Rs. {parcel.price}
              </p>
            </div>

            {/* Status & Live Sync Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => fetchTracking(parcel.trackingNumber, false)}
                disabled={syncing || loading}
                title="Refresh tracking status"
                aria-label="Refresh tracking status"
                className="flex items-center gap-1.5 rounded-md border border-ink-300 bg-white px-3 py-2 text-xs font-semibold text-ink-600 transition hover:bg-ink-100"
              >
                <RotateCw
                  className={`w-4 h-4 ${syncing ? "animate-spin text-brand-600" : ""}`}
                />
                <span className="hidden sm:inline">
                  {syncing ? "Syncing..." : "Sync Now"}
                </span>
              </button>

              <span
                className={`rounded-md border px-3 py-1.5 text-sm font-bold ${
                  parcel.status === "Delivered"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : parcel.status === "Cancelled"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-accent-50 text-accent-700 border-accent-200"
                }`}
              >
                {parcel.status}
              </span>
            </div>
          </div>

          {/* Stepper Timeline */}
          {parcel.status !== "Cancelled" && (
            <div className="overflow-x-auto rounded-md border border-ink-200 bg-white p-4 sm:p-5">
              <div className="relative z-0 flex min-w-130 items-center justify-between px-4">
                <div className="absolute left-6 right-6 top-1/2 z-0 h-1 -translate-y-1/2 bg-ink-100">
                  <div
                    className="h-full bg-brand-600 transition-all duration-500"
                    style={{
                      width: `${(Math.max(0, currentStep) / (steps.length - 1)) * 100}%`,
                    }}
                  ></div>
                </div>

                {steps.map((st, i) => {
                  const isPassed = i <= currentStep;
                  const isCurrent = i === currentStep;
                  return (
                    <div
                      key={st}
                      className="z-10 flex flex-col items-center bg-white px-1"
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border-2 transition ${
                          isPassed
                            ? "border-brand-500 bg-brand-600 text-white"
                            : "border-ink-300 bg-white text-ink-400"
                        } ${isCurrent ? "ring-4 ring-brand-100" : ""}`}
                      >
                        {isPassed ? <CheckCircle className="w-4 h-4" /> : i + 1}
                      </div>
                      <span
                        className={`mt-2 text-xs font-semibold text-center whitespace-nowrap ${
                          isCurrent
                            ? "font-bold text-brand-700"
                            : isPassed
                              ? "text-ink-800"
                              : "text-ink-400"
                        }`}
                      >
                        {st}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Live Driver Proximity Banner if In Transit */}
          {parcel.driver &&
            ["Assigned", "Picked Up", "In Transit"].includes(parcel.status) && (
              <div className="flex flex-col items-start justify-between gap-4 rounded-md border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <div className="rounded-md border border-emerald-200 bg-white p-2.5">
                    <Truck className="h-5 w-5 text-emerald-700" />
                  </div>
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-bold text-ink-900">
                      {parcel.status === "Assigned" ? "Courier heading to pickup" : "Courier on the way"}
                    </h4>
                    <p className="mt-0.5 text-xs text-ink-600">
                      {parcel.driver.name} ·{" "}
                      {parcel.driver.vehicleType || "Motorcycle"}
                    </p>
                  </div>
                </div>

                <div className="flex w-full items-center justify-between gap-4 sm:w-auto sm:justify-end">
                  {parcel.driver.phone && (
                    <a
                      href={`tel:${parcel.driver.phone}`}
                      className="flex items-center gap-1.5 rounded-md border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-50"
                    >
                      <Phone className="w-4 h-4" /> Call Driver
                    </a>
                  )}
                </div>
              </div>
            )}

          {/* Embedded delivery route */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-bold text-ink-900">
                <Navigation className="h-4 w-4 text-brand-600" />
                Route
              </h3>
              {lastSyncTime && (
                <span className="text-xs text-ink-500">
                  Updated {lastSyncTime.toLocaleTimeString()}
                </span>
              )}
            </div>

            <DeliveryMap
              pickup={parcel.pickupLocation}
              delivery={parcel.deliveryLocation}
              driverLocation={parcel.driver?.currentLocation}
              driverName={parcel.driver?.name || "Assigned Driver"}
              status={parcel.status}
              height="500px"
            />
          </div>

          {/* Sender & Receiver Card Summary */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 rounded-md border border-ink-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                <MapPin className="h-4 w-4" /> Pickup
              </div>
              <p className="text-sm font-semibold text-ink-900">
                {parcel.pickupContact?.name} ({parcel.pickupContact?.phone})
              </p>
              <p className="text-sm leading-relaxed text-ink-500">
                {parcel.pickupLocation?.address}
              </p>
            </div>

            <div className="space-y-2 rounded-md border border-ink-200 bg-white p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-brand-700">
                <MapPin className="h-4 w-4" /> Delivery
              </div>
              <p className="text-sm font-semibold text-ink-900">
                {parcel.deliveryContact?.name} ({parcel.deliveryContact?.phone})
              </p>
              <p className="text-sm leading-relaxed text-ink-500">
                {parcel.deliveryLocation?.address}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackParcel;
