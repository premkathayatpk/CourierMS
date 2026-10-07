import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  MapPin,
  Navigation,
  Package,
  Phone,
  RadioTower,
  Truck,
} from "lucide-react";
import { apiFetch, uploadImage } from "../../services/api";
import { fileUrl } from "../../config";
import PhotoInput from "../../components/common/PhotoInput";
import useDriverGps from "../../customeHook/useDriverGps";
import DeliveryMap from "../../components/common/DeliveryMap";
import {
  ACTIVE_STATUSES,
  directionsUrl,
  getNextStop,
} from "../../utils/route";

// Next action for each step of the delivery
const NEXT_ACTION = {
  Assigned: { status: "Picked Up", label: "Confirm pickup", icon: Package },
  "Picked Up": { status: "In Transit", label: "Start delivery trip", icon: Truck },
  "In Transit": { status: "Delivered", label: "Mark as delivered", icon: CheckCircle2 },
};

// How often to check for newly assigned jobs / status changes
const PARCEL_REFRESH_MS = 15000;

const DriverLiveDelivery = () => {
  const [searchParams] = useSearchParams();
  const [parcels, setParcels] = useState([]);
  // ?parcel=<id> preselects a job (links from the dashboard / task list)
  const [selectedId, setSelectedId] = useState(searchParams.get("parcel"));
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [proofBusy, setProofBusy] = useState(false);
  const [proofError, setProofError] = useState("");

  const { sharing, position, gpsError, start: startSharing, stop: stopSharing, setJobsActive } =
    useDriverGps();

  const fetchParcels = useCallback(async () => {
    try {
      const res = await apiFetch("/parcel/driverParcels");
      const active = (res.data || []).filter((p) => ACTIVE_STATUSES.includes(p.status));
      setParcels(active);
      setSelectedId((prev) =>
        active.some((p) => p._id === prev) ? prev : active[0]?._id || null,
      );
    } catch (err) {
      console.error("Error fetching driver parcels", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParcels();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") fetchParcels();
    }, PARCEL_REFRESH_MS);
    return () => clearInterval(timer);
  }, [fetchParcels]);

  // Keep GPS on while there is a delivery, even if the driver goes offline
  useEffect(() => {
    if (!loading) setJobsActive(parcels.length > 0);
  }, [loading, parcels.length, setJobsActive]);

  const parcel = parcels.find((p) => p._id === selectedId) || null;
  const stop = getNextStop(parcel);
  const action = parcel ? NEXT_ACTION[parcel.status] : null;

  // Live GPS if available, otherwise the last position the server knows
  const driverLocation = position || parcel?.driver?.currentLocation || null;

  const uploadProof = async (file) => {
    if (!parcel) return;
    setProofBusy(true);
    setProofError("");
    try {
      const res = await uploadImage(`/parcel/${parcel._id}/delivery-photo`, file);
      setParcels((prev) => prev.map((p) => (p._id === res.data._id ? res.data : p)));
    } catch (err) {
      setProofError(err.message || "Upload failed");
    } finally {
      setProofBusy(false);
    }
  };

  const handleNextStep = async () => {
    if (!parcel || !action) return;
    setStatusUpdating(true);
    try {
      await apiFetch(`/parcel/status/${parcel._id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: action.status }),
      });
      await fetchParcels();
    } catch (err) {
      alert(err.message || "Failed to update parcel status");
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">
            Live navigation
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Your route updates from your live GPS position.
          </p>
        </div>
        <GpsStatus
          sharing={sharing}
          position={position}
          onStart={startSharing}
          onStop={stopSharing}
        />
      </div>

      {gpsError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {gpsError}
        </div>
      )}

      {!parcel ? (
        <div className="card p-10 text-center">
          <Package className="mx-auto mb-3 h-10 w-10 text-ink-300" />
          <h2 className="font-bold text-ink-900">No active deliveries</h2>
          <p className="mt-1 text-sm text-ink-500">
            New jobs appear here as soon as dispatch assigns them to you.
          </p>
          <Link to="/driver/parcels" className="btn-secondary mt-5">
            View all my parcels
          </Link>
        </div>
      ) : (
        <>
          {/* Pick a job when several are active */}
          {parcels.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {parcels.map((p) => (
                <button
                  key={p._id}
                  onClick={() => setSelectedId(p._id)}
                  className={`shrink-0 rounded-lg border px-3 py-2 text-left text-xs font-semibold transition ${
                    p._id === selectedId
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-ink-200 bg-white text-ink-600 hover:border-ink-300"
                  }`}
                >
                  <span className="block font-mono">{p.trackingNumber}</span>
                  <span className="text-[11px] font-medium opacity-80">{p.status}</span>
                </button>
              ))}
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
            {/* Next stop card */}
            <div className="card flex flex-col p-5">
              <StepProgress status={parcel.status} />

              <p
                className={`mt-5 text-xs font-bold uppercase tracking-wider ${
                  stop.kind === "pickup" ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {stop.title}
              </p>
              <p className="mt-1 flex items-start gap-2 text-base font-bold text-ink-900">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
                {stop.location?.address}
              </p>
              <p className="mt-2 text-sm text-ink-600">
                {stop.contact?.name}
                {stop.contact?.phone && (
                  <span className="text-ink-400"> · {stop.contact.phone}</span>
                )}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <a
                  href={directionsUrl(stop.location, position)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                >
                  <Navigation className="h-4 w-4" /> Navigate
                </a>
                <a href={`tel:${stop.contact?.phone}`} className="btn-secondary">
                  <Phone className="h-4 w-4" /> Call
                </a>
              </div>

              {/* Pickup: show the customer's package photo to recognise it */}
              {stop.kind === "pickup" && parcel.photo && (
                <img
                  src={fileUrl(parcel.photo)}
                  alt="Package"
                  className="mt-4 h-32 w-full rounded-lg border border-ink-200 object-cover"
                />
              )}

              {/* Delivery: proof-of-delivery photo straight from the camera */}
              {stop.kind === "delivery" && (
                <div className="mt-4">
                  <p className="mb-1.5 text-xs font-semibold text-ink-600">Proof of delivery</p>
                  <PhotoInput
                    src={fileUrl(parcel.deliveryPhoto)}
                    onSelect={uploadProof}
                    busy={proofBusy}
                    camera
                    label="Take delivery photo"
                    hint="Photo of the parcel at the door"
                  />
                  {proofError && <p className="mt-1.5 text-xs text-rose-700">{proofError}</p>}
                </div>
              )}

              <div className="mt-4 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-600">
                <span className="font-mono font-semibold text-ink-800">
                  {parcel.trackingNumber}
                </span>{" "}
                · {parcel.parcelType} · {parcel.weight} kg
                {parcel.notes && <p className="mt-1 text-ink-500">Note: {parcel.notes}</p>}
              </div>

              {action && (
                <button
                  onClick={handleNextStep}
                  disabled={statusUpdating}
                  className="btn-primary mt-auto w-full py-3 lg:mt-6"
                >
                  <action.icon className="h-4 w-4" />
                  {statusUpdating ? "Updating…" : action.label}
                </button>
              )}
            </div>

            <DeliveryMap
              pickup={parcel.pickupLocation}
              delivery={parcel.deliveryLocation}
              driverLocation={driverLocation}
              driverName="You"
              status={parcel.status}
              height="560px"
            />
          </div>
        </>
      )}
    </div>
  );
};

const STEPS = [
  { label: "Pickup", done: ["Picked Up", "In Transit", "Delivered"] },
  { label: "On the way", done: ["In Transit", "Delivered"] },
  { label: "Delivered", done: ["Delivered"] },
];

const StepProgress = ({ status }) => (
  <ol className="grid grid-cols-3 gap-1.5">
    {STEPS.map((step) => {
      const done = step.done.includes(status);
      return (
        <li key={step.label}>
          <span
            className={`block h-1.5 rounded-full ${done ? "bg-emerald-500" : "bg-ink-200"}`}
          />
          <span
            className={`mt-1.5 block text-[11px] font-semibold ${done ? "text-emerald-700" : "text-ink-500"}`}
          >
            {step.label}
          </span>
        </li>
      );
    })}
  </ol>
);

const GpsStatus = ({ sharing, position, onStart, onStop }) =>
  sharing ? (
    <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 py-1.5 pl-3 pr-1.5">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
      </span>
      <span className="text-xs font-semibold text-emerald-800">
        {position
          ? `Sharing location · ±${position.accuracy} m`
          : "Finding your location…"}
      </span>
      <button
        onClick={onStop}
        className="rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50"
      >
        Stop
      </button>
    </div>
  ) : (
    <button onClick={onStart} className="btn-primary">
      <RadioTower className="h-4 w-4" /> Share live location
    </button>
  );

export default DriverLiveDelivery;
