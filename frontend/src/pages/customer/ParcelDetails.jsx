import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { apiFetch, uploadImage } from "../../services/api";
import { fileUrl } from "../../config";
import PhotoInput from "../../components/common/PhotoInput";
import Avatar from "../../components/common/Avatar";
import DeliveryMap from "../../components/common/DeliveryMap";
import { ACTIVE_STATUSES } from "../../utils/route";
import {
  Package,
  MapPin,
  Truck,
  Clock,
  ArrowLeft,
  Copy,
  Check,
  Compass,
} from "lucide-react";

const ParcelDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [parcel, setParcel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");

  const changePackagePhoto = async (file) => {
    setPhotoBusy(true);
    setPhotoError("");
    try {
      const res = await uploadImage(`/parcel/${id}/photo`, file);
      setParcel(res.data);
    } catch (err) {
      setPhotoError(err.message || "Upload failed");
    } finally {
      setPhotoBusy(false);
    }
  };

  useEffect(() => {
    const fetchParcel = async () => {
      try {
        const res = await apiFetch(`/parcel/${id}`);
        setParcel(res.data);
        setError("");
      } catch (err) {
        setError(err.message || "Parcel not found");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchParcel();
  }, [id]);

  // Follow the courier live while the delivery is in progress
  const isActive = ACTIVE_STATUSES.includes(parcel?.status);
  useEffect(() => {
    if (!isActive) return;
    const timer = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await apiFetch(`/parcel/${id}`);
        setParcel(res.data);
      } catch {
        // keep showing the last known state
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [id, isActive]);

  const handleCopy = () => {
    if (parcel?.trackingNumber) {
      navigator.clipboard.writeText(parcel.trackingNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const steps = ["Pending", "Assigned", "Picked Up", "In Transit", "Delivered"];

  const getStepIndex = (status) => {
    if (status === "Cancelled") return -1;
    return steps.indexOf(status);
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-semibold text-ink-500">Loading delivery details...</p>
      </div>
    );
  }

  if (error || !parcel) {
    return (
      <div className="bg-white p-12 rounded-3xl border border-ink-200 text-center max-w-xl mx-auto shadow-sm">
        <Package className="w-12 h-12 text-ink-300 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-ink-800 mb-1">Parcel Not Found</h2>
        <p className="text-xs text-ink-500 mb-5">{error || "Could not retrieve parcel details."}</p>
        <Link
          to="/customer/parcels"
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Parcels
        </Link>
      </div>
    );
  }

  const currentStep = getStepIndex(parcel.status);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-bold text-ink-600 hover:text-brand-600 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-3">
          <div className="bg-ink-100 px-3.5 py-1.5 rounded-xl flex items-center gap-2 border border-ink-200">
            <span className="text-xs text-ink-500">Tracking:</span>
            <span className="font-mono font-bold text-xs text-brand-700">
              {parcel.trackingNumber}
            </span>
            <button
              onClick={handleCopy}
              className="text-ink-400 hover:text-ink-700 p-1"
              title="Copy Tracking Number"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <Link
            to={`/track/${parcel.trackingNumber}`}
            className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition shadow-sm"
          >
            <Compass className="w-3.5 h-3.5" />
            Live Tracker View
          </Link>
        </div>
      </div>

      {/* Progress Timeline Stepper */}
      <div className="bg-white p-6 rounded-3xl border border-ink-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink-500">
            Delivery Lifecycle
          </h2>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              parcel.status === "Delivered"
                ? "bg-emerald-100 text-emerald-800"
                : parcel.status === "Cancelled"
                ? "bg-rose-100 text-rose-800"
                : "bg-brand-100 text-brand-800"
            }`}
          >
            Current Status: {parcel.status}
          </span>
        </div>

        {parcel.status === "Cancelled" ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold">
            This parcel was cancelled and will not be dispatched.
          </div>
        ) : (
          <div className="relative flex items-center justify-between mt-6 px-4">
            {/* Horizontal progress bar */}
            <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-ink-100 -z-0">
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
                <div key={st} className="flex flex-col items-center z-10">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border-2 transition ${
                      isPassed
                        ? "bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-500/30"
                        : "bg-white text-ink-400 border-ink-300"
                    } ${isCurrent ? "ring-4 ring-brand-100" : ""}`}
                  >
                    {isPassed ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <span
                    className={`mt-2 text-xs font-semibold text-center whitespace-nowrap ${
                      isCurrent
                        ? "text-brand-600 font-bold"
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
        )}
      </div>

      {/* Main Delivery Map with Live Route */}
      <div className="space-y-2">
        <h2 className="text-base font-extrabold text-ink-900 flex items-center gap-2">
          <Truck className="w-5 h-5 text-brand-600" />
          Delivery route
        </h2>
        <DeliveryMap
          pickup={parcel.pickupLocation}
          delivery={parcel.deliveryLocation}
          driverLocation={parcel.driver?.currentLocation}
          driverName={parcel.driver?.name || "Assigned Driver"}
          status={parcel.status}
          height="480px"
        />
      </div>

      {/* Photos */}
      <div className="card p-5">
        <h2 className="mb-4 text-base font-bold text-ink-900">Photos</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">
              Package
            </p>
            {["Pending", "Assigned"].includes(parcel.status) ? (
              <PhotoInput
                src={fileUrl(parcel.photo)}
                onSelect={changePackagePhoto}
                busy={photoBusy}
                label="Add a photo of the package"
                hint="You can change it until the driver picks it up"
              />
            ) : parcel.photo ? (
              <a href={fileUrl(parcel.photo)} target="_blank" rel="noreferrer">
                <img
                  src={fileUrl(parcel.photo)}
                  alt="Package"
                  className="h-48 w-full rounded-xl border border-ink-200 object-cover"
                />
              </a>
            ) : (
              <p className="rounded-xl bg-ink-50 p-4 text-sm text-ink-500">No package photo.</p>
            )}
            {photoError && <p className="mt-2 text-sm text-rose-700">{photoError}</p>}
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">
              Proof of delivery
            </p>
            {parcel.deliveryPhoto ? (
              <a href={fileUrl(parcel.deliveryPhoto)} target="_blank" rel="noreferrer">
                <img
                  src={fileUrl(parcel.deliveryPhoto)}
                  alt="Proof of delivery"
                  className="h-48 w-full rounded-xl border border-ink-200 object-cover"
                />
              </a>
            ) : (
              <p className="rounded-xl bg-ink-50 p-4 text-sm text-ink-500">
                The courier adds a photo when the parcel is delivered.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Information Cards Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Sender details */}
        <div className="bg-white p-5 rounded-2xl border border-ink-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-ink-100 text-emerald-700">
            <MapPin className="w-4 h-4" />
            <h3 className="font-bold text-sm">Pickup Details</h3>
          </div>
          <div>
            <span className="text-[10px] text-ink-400 font-semibold uppercase block">
              Sender Name
            </span>
            <p className="font-bold text-ink-800 text-sm">{parcel.pickupContact?.name}</p>
          </div>
          <div>
            <span className="text-[10px] text-ink-400 font-semibold uppercase block">
              Phone
            </span>
            <p className="font-medium text-ink-700 text-xs">{parcel.pickupContact?.phone}</p>
          </div>
          <div>
            <span className="text-[10px] text-ink-400 font-semibold uppercase block">
              Address
            </span>
            <p className="font-medium text-ink-700 text-xs">{parcel.pickupLocation?.address}</p>
          </div>
        </div>

        {/* Receiver details */}
        <div className="bg-white p-5 rounded-2xl border border-ink-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-ink-100 text-rose-700">
            <MapPin className="w-4 h-4" />
            <h3 className="font-bold text-sm">Destination Details</h3>
          </div>
          <div>
            <span className="text-[10px] text-ink-400 font-semibold uppercase block">
              Recipient Name
            </span>
            <p className="font-bold text-ink-800 text-sm">{parcel.deliveryContact?.name}</p>
          </div>
          <div>
            <span className="text-[10px] text-ink-400 font-semibold uppercase block">
              Phone
            </span>
            <p className="font-medium text-ink-700 text-xs">{parcel.deliveryContact?.phone}</p>
          </div>
          <div>
            <span className="text-[10px] text-ink-400 font-semibold uppercase block">
              Address
            </span>
            <p className="font-medium text-ink-700 text-xs">{parcel.deliveryLocation?.address}</p>
          </div>
        </div>

        {/* Assigned Courier / Driver details */}
        <div className="bg-white p-5 rounded-2xl border border-ink-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-ink-100 text-brand-700">
            <Truck className="w-4 h-4" />
            <h3 className="font-bold text-sm">Courier Personnel</h3>
          </div>
          {parcel.driver ? (
            <>
              <div className="flex items-center gap-3">
                <Avatar user={parcel.driver} size="sm" />
                <div>
                  <span className="text-[10px] text-ink-400 font-semibold uppercase block">
                    Courier Name
                  </span>
                  <p className="font-bold text-ink-800 text-sm">{parcel.driver.name}</p>
                </div>
              </div>
              <div>
                <span className="text-[10px] text-ink-400 font-semibold uppercase block">
                  Contact
                </span>
                <p className="font-medium text-ink-700 text-xs">{parcel.driver.phone}</p>
              </div>
              <div>
                <span className="text-[10px] text-ink-400 font-semibold uppercase block">
                  Vehicle & License
                </span>
                <p className="font-medium text-ink-700 text-xs">
                  {parcel.driver.vehicleType || "Bike"} • {parcel.driver.licenseNumber || "Standard"}
                </p>
              </div>
            </>
          ) : (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs">
              <Clock className="w-4 h-4 text-amber-600 mb-1" />
              A driver will be assigned shortly by logistics dispatch.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParcelDetails;