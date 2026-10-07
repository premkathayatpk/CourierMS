import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, uploadImage } from "../../services/api";
import PhotoInput from "../../components/common/PhotoInput";
import DeliveryMap from "../../components/common/DeliveryMap";
import { searchPlaces } from "../../services/geocoding";
import {
  Package,
  MapPin,
  User,
  Phone,
  Weight,
  AlertCircle,
  CheckCircle,
  Navigation,
  ArrowRight,
  Search,
} from "lucide-react";

const CreateParcel = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // Optional package photo, uploaded right after the parcel is created
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview("");
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const [formData, setFormData] = useState({
    parcelType: "Document",
    weight: "1.0",
    notes: "",
    pickupContact: {
      name: "",
      phone: "",
    },
    pickupLocation: {
      address: "",
      latitude: null,
      longitude: null,
    },
    deliveryContact: {
      name: "",
      phone: "",
    },
    deliveryLocation: {
      address: "",
      latitude: null,
      longitude: null,
    },
  });

  // Autocomplete / Search state for textareas
  const [searchingPickup, setSearchingPickup] = useState(false);
  const [searchingDelivery, setSearchingDelivery] = useState(false);
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [deliverySuggestions, setDeliverySuggestions] = useState([]);

  // "Nothing found" hints under the address search boxes
  const [searchNote, setSearchNote] = useState({ pickup: "", delivery: "" });

  // Live price quote from the backend: validates the service area, measures the
  // road distance with A* and prices it (distance + weight + parcel type).
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoting, setQuoting] = useState(false);

  const { pickupLocation: pl, deliveryLocation: dl, weight, parcelType } = formData;
  useEffect(() => {
    const ready =
      pl.latitude !== null && pl.longitude !== null &&
      dl.latitude !== null && dl.longitude !== null &&
      Number(weight) > 0;
    if (!ready) {
      setQuote(null);
      setQuoteError("");
      return;
    }
    let cancelled = false;
    setQuoting(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch("/parcel/quote", {
          method: "POST",
          body: JSON.stringify({ pickupLocation: pl, deliveryLocation: dl, weight, parcelType }),
        });
        if (!cancelled) {
          setQuote(res.quote);
          setQuoteError("");
        }
      } catch (err) {
        if (!cancelled) {
          setQuote(null);
          setQuoteError(err.message);
        }
      } finally {
        if (!cancelled) setQuoting(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // Re-quote only when coordinates/weight/type change, not on every address keystroke
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pl.latitude, pl.longitude, dl.latitude, dl.longitude, weight, parcelType]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (section, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
        ...(field === "address" &&
        (section === "pickupLocation" || section === "deliveryLocation")
          ? { latitude: null, longitude: null }
          : {}),
      },
    }));
  };

  // Search geocode for pickup textarea
  const handleGeocodePickup = async () => {
    if (!formData.pickupLocation.address.trim()) return;
    setSearchingPickup(true);
    const results = await searchPlaces(formData.pickupLocation.address);
    setPickupSuggestions(results);
    setSearchNote((n) => ({
      ...n,
      pickup: results.length ? "" : "No matching place inside Kathmandu, Lalitpur or Bhaktapur. Try a nearby landmark.",
    }));
    setSearchingPickup(false);
  };

  const applyPickupSelection = (loc) => {
    setFormData((prev) => ({
      ...prev,
      pickupLocation: {
        address: loc.name,
        latitude: loc.lat,
        longitude: loc.lng,
      },
    }));
    setPickupSuggestions([]);
  };

  // Search geocode for delivery destination textarea
  const handleGeocodeDelivery = async () => {
    if (!formData.deliveryLocation.address.trim()) return;
    setSearchingDelivery(true);
    const results = await searchPlaces(formData.deliveryLocation.address);
    setDeliverySuggestions(results);
    setSearchNote((n) => ({
      ...n,
      delivery: results.length ? "" : "No matching place inside Kathmandu, Lalitpur or Bhaktapur. Try a nearby landmark.",
    }));
    setSearchingDelivery(false);
  };

  const applyDeliverySelection = (loc) => {
    setFormData((prev) => ({
      ...prev,
      deliveryLocation: {
        address: loc.name,
        latitude: loc.lat,
        longitude: loc.lng,
      },
    }));
    setDeliverySuggestions([]);
  };

  // Map drag or click update callback
  const handleMapLocationChange = ({ pickup, delivery }) => {
    setFormData((prev) => ({
      ...prev,
      ...(pickup && {
        pickupLocation: {
          address: pickup.address,
          latitude: pickup.lat,
          longitude: pickup.lng,
        },
      }),
      ...(delivery && {
        deliveryLocation: {
          address: delivery.address,
          latitude: delivery.lat,
          longitude: delivery.lng,
        },
      }),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!formData.pickupContact.name || !formData.pickupContact.phone) {
      setError("Please fill out Sender contact details.");
      setLoading(false);
      return;
    }

    if (!formData.deliveryContact.name || !formData.deliveryContact.phone) {
      setError("Please fill out Recipient contact details.");
      setLoading(false);
      return;
    }

    const locations = [formData.pickupLocation, formData.deliveryLocation];
    const locationsAreResolved = locations.every(
      (location) =>
        location.address.trim() &&
        location.latitude !== null &&
        location.longitude !== null &&
        Number.isFinite(Number(location.latitude)) &&
        Number.isFinite(Number(location.longitude)),
    );
    if (!locationsAreResolved) {
      setError(
        "Locate both addresses or choose a suggested place before booking.",
      );
      setLoading(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        weight: parseFloat(formData.weight),
        pickupLocation: {
          address: formData.pickupLocation.address,
          latitude: Number(formData.pickupLocation.latitude),
          longitude: Number(formData.pickupLocation.longitude),
        },
        deliveryLocation: {
          address: formData.deliveryLocation.address,
          latitude: Number(formData.deliveryLocation.latitude),
          longitude: Number(formData.deliveryLocation.longitude),
        },
      };

      const res = await apiFetch("/parcel/create", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.success) {
        let photoNote = "";
        if (photoFile) {
          try {
            await uploadImage(`/parcel/${res.data._id}/photo`, photoFile);
          } catch {
            photoNote = " The photo couldn't be uploaded. You can add it from the parcel page.";
          }
        }
        setSuccess(`${res.data.trackingNumber}: ${res.message}${photoNote}`);
        setTimeout(() => {
          navigate(`/customer/parcel/${res.data._id}`);
        }, 1200);
      }
    } catch (err) {
      setError(err.message || "Failed to create parcel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900 flex items-center gap-2">
          <Package className="w-8 h-8 text-brand-600" />
          Book a Courier Delivery
        </h1>
        <p className="text-sm text-ink-500 mt-1">
          Enter pickup and delivery details, then locate each address to set its
          map position.
        </p>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
          <MapPin className="h-3.5 w-3.5" /> We pick up and deliver within Kathmandu, Lalitpur and Bhaktapur.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-2xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Sender Pickup Details */}
        <div className="bg-white p-6 rounded-3xl border border-ink-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-ink-100">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <h2 className="text-base font-bold text-ink-800">
                Sender / Pickup Details & Location
              </h2>
              <p className="text-xs text-ink-400">
                Who and where should the driver pick up this courier?
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-ink-600 block mb-1">
                Sender Contact Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-ink-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={formData.pickupContact.name}
                  onChange={(e) =>
                    handleNestedChange("pickupContact", "name", e.target.value)
                  }
                  required
                  className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-600 block mb-1">
                Sender Phone Number *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-ink-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  placeholder="e.g. 9801234567"
                  value={formData.pickupContact.phone}
                  onChange={(e) =>
                    handleNestedChange("pickupContact", "phone", e.target.value)
                  }
                  required
                  className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Typeable Pickup Location Textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-600" />
                Pickup Location Name & Address (Type in Text Area) *
              </label>
              <span className="text-[11px] text-ink-400">
                Type place name, landmark or building
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <textarea
                name="pickupLocationAddress"
                rows="2"
                placeholder="Enter a pickup address or landmark"
                value={formData.pickupLocation.address}
                onChange={(e) =>
                  handleNestedChange(
                    "pickupLocation",
                    "address",
                    e.target.value,
                  )
                }
                required
                className="w-full text-sm p-3 rounded-2xl border border-ink-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
              />

              <button
                type="button"
                onClick={handleGeocodePickup}
                disabled={searchingPickup}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 shrink-0 self-stretch sm:self-auto"
              >
                <Search className="w-4 h-4" />
                {searchingPickup ? "Locating..." : "Locate on Map"}
              </button>
            </div>

            {/* Suggestions dropdown if found */}
            {pickupSuggestions.length > 0 && (
              <div className="bg-white border border-emerald-200 rounded-2xl shadow-lg p-2 space-y-1">
                <span className="text-[11px] text-emerald-700 font-bold px-2 block">
                  Select Matched Location:
                </span>
                {pickupSuggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPickupSelection(s)}
                    className="w-full text-left text-xs p-2 hover:bg-emerald-50 text-ink-700 rounded-xl truncate flex items-center gap-2 transition"
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate font-medium">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
            {searchNote.pickup && <p className="text-xs text-amber-700">{searchNote.pickup}</p>}
          </div>
        </div>

        {/* Step 2: Receiver Delivery Details */}
        <div className="bg-white p-6 rounded-3xl border border-ink-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-ink-100">
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div>
              <h2 className="text-base font-bold text-ink-800">
                Recipient / Delivery Destination Details & Location
              </h2>
              <p className="text-xs text-ink-400">
                Who and where are we delivering this to?
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-ink-600 block mb-1">
                Recipient Contact Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-ink-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="e.g. Jane Smith"
                  value={formData.deliveryContact.name}
                  onChange={(e) =>
                    handleNestedChange(
                      "deliveryContact",
                      "name",
                      e.target.value,
                    )
                  }
                  required
                  className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-600 block mb-1">
                Recipient Phone Number *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-ink-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  placeholder="e.g. 9841002233"
                  value={formData.deliveryContact.phone}
                  onChange={(e) =>
                    handleNestedChange(
                      "deliveryContact",
                      "phone",
                      e.target.value,
                    )
                  }
                  required
                  className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Typeable Destination Location Textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-600" />
                Delivery Destination Name & Address (Type in Text Area) *
              </label>
              <span className="text-[11px] text-ink-400">
                Type destination street, area or office name
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <textarea
                name="deliveryLocationAddress"
                rows="2"
                placeholder="Enter a delivery address or landmark"
                value={formData.deliveryLocation.address}
                onChange={(e) =>
                  handleNestedChange(
                    "deliveryLocation",
                    "address",
                    e.target.value,
                  )
                }
                required
                className="w-full text-sm p-3 rounded-2xl border border-ink-300 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-inner"
              />

              <button
                type="button"
                onClick={handleGeocodeDelivery}
                disabled={searchingDelivery}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20 shrink-0 self-stretch sm:self-auto"
              >
                <Search className="w-4 h-4" />
                {searchingDelivery ? "Locating..." : "Locate on Map"}
              </button>
            </div>

            {/* Suggestions dropdown if found */}
            {deliverySuggestions.length > 0 && (
              <div className="bg-white border border-rose-200 rounded-2xl shadow-lg p-2 space-y-1">
                <span className="text-[11px] text-rose-700 font-bold px-2 block">
                  Select Matched Location:
                </span>
                {deliverySuggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyDeliverySelection(s)}
                    className="w-full text-left text-xs p-2 hover:bg-rose-50 text-ink-700 rounded-xl truncate flex items-center gap-2 transition"
                  >
                    <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span className="truncate font-medium">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
            {searchNote.delivery && <p className="text-xs text-amber-700">{searchNote.delivery}</p>}
          </div>
        </div>

        {/* Live route preview */}
        <div className="bg-white p-6 rounded-3xl border border-ink-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-ink-800 flex items-center gap-2">
              <Navigation className="w-5 h-5 text-brand-600" />
              Route preview
            </h2>
            <span className="text-xs text-ink-500 font-medium">
              Drag pins on the map to adjust exact drop points
            </span>
          </div>

          <DeliveryMap
            pickup={formData.pickupLocation}
            delivery={formData.deliveryLocation}
            height="400px"
            editable
            showServiceArea
            onLocationChange={handleMapLocationChange}
          />
        </div>

        {/* Step 3: Package Specifications & Pricing */}
        <div className="bg-white p-6 rounded-3xl border border-ink-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-ink-100">
            <div className="w-8 h-8 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <div>
              <h2 className="text-base font-bold text-ink-800">
                Package Details & Pricing
              </h2>
              <p className="text-xs text-ink-400">
                Item classification, weight, and delivery notes
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-ink-600 block mb-1">
                Parcel Category *
              </label>
              <select
                value={formData.parcelType}
                onChange={(e) =>
                  handleInputChange("parcelType", e.target.value)
                }
                className="w-full text-sm p-3 rounded-xl border border-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
              >
                <option value="Document">Document (Legal, Paperwork)</option>
                <option value="Electronics">
                  Electronics (Laptops, Phones)
                </option>
                <option value="Clothes">Clothing & Apparel</option>
                <option value="Medicine">Medicine & Health Products</option>
                <option value="Food">Food / Perishables</option>
                <option value="Fragile">Fragile (Glass, Ceramics)</option>
                <option value="Other">Other General Package</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-ink-600 block mb-1">
                Estimated Weight (KG) *
              </label>
              <div className="relative">
                <Weight className="w-4 h-4 text-ink-400 absolute left-3 top-3.5" />
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="100"
                  value={formData.weight}
                  onChange={(e) => handleInputChange("weight", e.target.value)}
                  required
                  className="w-full text-sm pl-9 pr-3 py-2.5 rounded-xl border border-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-600 block mb-1">
              Instructions for Courier (Optional)
            </label>
            <textarea
              rows="2"
              placeholder="e.g. Ring bell twice, deliver before 5 PM, handle with care."
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              className="w-full text-sm p-3 rounded-xl border border-ink-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-600 block mb-1">
              Package Photo (Optional)
            </label>
            <PhotoInput
              src={photoPreview}
              onSelect={setPhotoFile}
              onRemove={() => setPhotoFile(null)}
              label="Add a photo of the package"
              hint="Helps the courier recognise it at pickup"
              className="max-w-sm"
            />
          </div>

          {/* Price: live quote (A* road distance + weight + parcel type) */}
          {quoteError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {quoteError}
            </div>
          )}
          <div className="border border-brand-100 bg-brand-50 text-ink-900 p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-auto">
              <span className="text-xs text-brand-700 font-bold uppercase tracking-wider block">
                Delivery Charge
              </span>
              {quote ? (
                <>
                  <span className="mt-1 block text-3xl font-black">Rs. {quote.total}</span>
                  <span className="text-xs text-ink-600">
                    {quote.distanceKm} km by road
                    {quote.durationMinutes ? ` · about ${quote.durationMinutes} min` : ""}
                  </span>
                  <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-ink-600 sm:grid-cols-4">
                    <div><dt className="text-ink-500">Base</dt><dd className="font-semibold text-ink-900">Rs. {quote.breakdown.base}</dd></div>
                    <div><dt className="text-ink-500">Distance</dt><dd className="font-semibold text-ink-900">Rs. {quote.breakdown.distance}</dd></div>
                    <div><dt className="text-ink-500">Weight</dt><dd className="font-semibold text-ink-900">Rs. {quote.breakdown.weight}</dd></div>
                    {quote.breakdown.surcharge > 0 && (
                      <div><dt className="text-ink-500">{formData.parcelType}</dt><dd className="font-semibold text-ink-900">Rs. {quote.breakdown.surcharge}</dd></div>
                    )}
                    {quote.breakdown.minimumFareAdjustment > 0 && (
                      <div><dt className="text-ink-500">Min. fare</dt><dd className="font-semibold text-ink-900">Rs. {quote.breakdown.minimumFareAdjustment}</dd></div>
                    )}
                  </dl>
                </>
              ) : (
                <span className="mt-1 block text-sm text-ink-600">
                  {quoting ? "Calculating route and price…" : "Locate pickup and destination to see the price."}
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !quote}
              className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white font-bold px-8 py-3.5 rounded-2xl shadow-md shadow-brand-600/20 flex items-center justify-center gap-2 transition shrink-0"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Dispatching Courier...
                </>
              ) : (
                <>
                  Confirm & Dispatch Courier <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateParcel;
