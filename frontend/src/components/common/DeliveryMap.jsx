import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { Crosshair } from "lucide-react";
import { apiFetch } from "../../services/api";
import { getServiceArea, reverseGeocode } from "../../services/geocoding";
import { DEFAULT_CENTER, addBaseTiles } from "../../utils/mapTiles";
import {
  distanceMeters,
  formatDistance,
  formatDuration,
  getRouteLeg,
  toPoint,
} from "../../utils/route";


// Re-request a road route only when the origin moved this far (metres)
const REROUTE_DISTANCE_M = 60;
// Fallback speed for the straight-line estimate when no road route is available
const FALLBACK_SPEED_KMH = 25;

const ICONS = {
  pickup: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>`,
  delivery: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 22V4a1 1 0 0 1 1-1h11l-2 4 2 4H5"/></svg>`,
  driver: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>`,
};

const makeIcon = (kind, extraClass = "") =>
  L.divIcon({
    className: "",
    html: `<div class="map-pin map-pin--${kind} ${extraClass}">${ICONS[kind]}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });

// Popup content built with textContent so user-entered addresses can't inject HTML
const popupContent = (title, text) => {
  const el = document.createElement("div");
  el.className = "map-popup";
  const strong = document.createElement("strong");
  strong.textContent = title;
  el.appendChild(strong);
  if (text) {
    const p = document.createElement("p");
    p.textContent = text;
    el.appendChild(p);
  }
  return el;
};

const DeliveryMap = ({
  pickup = null,
  delivery = null,
  driverLocation = null,
  driverName = "Courier",
  status = "Pending",
  height = "460px",
  editable = false, // drag pickup/delivery pins (used when booking)
  onLocationChange = null,
  showServiceArea = false, // outline the Kathmandu/Lalitpur/Bhaktapur service area
}) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({ pickup: null, delivery: null, driver: null });
  const routeLayerRef = useRef(null);
  const lastRouteRef = useRef({ key: null, origin: null });
  const fittedKeyRef = useRef(null);
  const routeAbortRef = useRef(null);
  const onChangeRef = useRef(onLocationChange);
  onChangeRef.current = onLocationChange;

  const [routeInfo, setRouteInfo] = useState(null);

  const pickupPt = toPoint(pickup);
  const deliveryPt = toPoint(delivery);
  const driverPt = toPoint(driverLocation);

  const leg = useMemo(
    () => getRouteLeg({ status, pickup, delivery, driver: driverLocation }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      status,
      pickupPt?.lat, pickupPt?.lng,
      deliveryPt?.lat, deliveryPt?.lng,
      driverPt?.lat, driverPt?.lng,
    ],
  );

  // ---- Create the map once ----
  useEffect(() => {
    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      zoomControl: false,
    });
    L.control.zoom({ position: "topright" }).addTo(map);
    addBaseTiles(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Keep tiles sharp when the container is resized (sidebar, tabs, etc.)
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      markersRef.current = { pickup: null, delivery: null, driver: null };
    };
  }, []);

  // ---- Service-area outline (booking page) ----
  useEffect(() => {
    if (!showServiceArea) return;
    let layer = null;
    let cancelled = false;
    getServiceArea()
      .then(({ geojson }) => {
        if (cancelled || !mapRef.current) return;
        layer = L.geoJSON(geojson, {
          interactive: false,
          style: { color: "#2563eb", weight: 2, dashArray: "6 6", fillColor: "#3b82f6", fillOpacity: 0.04 },
        }).addTo(mapRef.current);
        layer.bringToBack();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (layer && mapRef.current) mapRef.current.removeLayer(layer);
    };
  }, [showServiceArea]);

  // ---- Markers: create once, then just move them ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const upsert = (kind, point, { title, text, draggable, className }) => {
      const existing = markersRef.current[kind];
      if (!point) {
        if (existing) map.removeLayer(existing);
        markersRef.current[kind] = null;
        return;
      }
      if (existing) {
        existing.setLatLng([point.lat, point.lng]);
        existing.setIcon(makeIcon(kind, className));
        existing.setPopupContent(popupContent(title, text));
        return;
      }
      const marker = L.marker([point.lat, point.lng], {
        icon: makeIcon(kind, className),
        draggable,
        zIndexOffset: kind === "driver" ? 1000 : 0,
        title,
      })
        .bindPopup(popupContent(title, text))
        .addTo(map);

      if (draggable) {
        marker.on("dragend", async (e) => {
          const { lat, lng } = e.target.getLatLng();
          const { address } = await reverseGeocode(lat, lng);
          onChangeRef.current?.({ [kind]: { lat, lng, address } });
        });
      }
      markersRef.current[kind] = marker;
    };

    const pickedUp = ["Picked Up", "In Transit", "Delivered"].includes(status);

    upsert("pickup", pickupPt, {
      title: pickedUp ? "Pickup (collected)" : "Pickup",
      text: pickupPt?.address,
      draggable: editable,
      className: pickedUp ? "map-pin--done" : "",
    });
    upsert("delivery", deliveryPt, {
      title: "Destination",
      text: deliveryPt?.address,
      draggable: editable,
    });
    upsert("driver", driverPt, {
      title: driverName,
      text: status,
      draggable: false,
      className: "map-pin--live",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pickupPt?.lat, pickupPt?.lng, pickupPt?.address,
    deliveryPt?.lat, deliveryPt?.lng, deliveryPt?.address,
    driverPt?.lat, driverPt?.lng,
    status, driverName, editable,
  ]);

  // Fit all visible points into view
  const fitToRoute = () => {
    const map = mapRef.current;
    if (!map) return;
    const pts = [pickupPt, deliveryPt, driverPt].filter(Boolean);
    const routeBounds = routeLayerRef.current?.getLayers()[0]?.getBounds?.();
    if (routeBounds?.isValid()) {
      pts.forEach((p) => routeBounds.extend([p.lat, p.lng]));
      map.fitBounds(routeBounds, { padding: [48, 48], maxZoom: 16 });
    } else if (pts.length > 1) {
      map.fitBounds(pts.map((p) => [p.lat, p.lng]), { padding: [48, 48], maxZoom: 16 });
    } else if (pts.length === 1) {
      map.setView([pts[0].lat, pts[0].lng], 14);
    }
  };

  // ---- Road route for the current leg ----
  useEffect(() => {
    const map = mapRef.current;
    const layer = routeLayerRef.current;
    if (!map || !layer) return;

    if (!leg) {
      layer.clearLayers();
      lastRouteRef.current = { key: null, origin: null };
      setRouteInfo(null);
      fitToRoute();
      return;
    }

    // The route only needs refetching when the leg/destination changes or the
    // origin (usually the moving driver) has drifted far from the last fetch.
    const key = `${leg.kind}|${leg.to.lat},${leg.to.lng}|${leg.kind === "overview" ? `${leg.from.lat},${leg.from.lng}` : ""}`;
    const last = lastRouteRef.current;
    const moved = last.origin ? distanceMeters(last.origin, leg.from) : Infinity;
    if (last.key === key && moved < REROUTE_DISTANCE_M) return;
    lastRouteRef.current = { key, origin: leg.from };

    // Cancel a slower request for an outdated leg, but never the current one
    routeAbortRef.current?.abort();
    const controller = new AbortController();
    routeAbortRef.current = controller;

    const draw = (coords, info, dashed = false) => {
      layer.clearLayers();
      // Main leg is added first so fitToRoute can read its bounds
      const main = L.polyline(coords, {
        color: "#2563eb",
        weight: 6,
        opacity: 0.9,
        lineJoin: "round",
        dashArray: dashed ? "8 10" : null,
      }).addTo(layer);
      // White casing underneath for contrast on busy tiles
      L.polyline(coords, { color: "#ffffff", weight: 10, opacity: 0.9 })
        .addTo(layer)
        .bringToBack();
      // Heading to the pickup: hint at the remaining pickup -> destination leg
      if (leg.kind === "toPickup" && pickupPt && deliveryPt) {
        L.polyline(
          [[pickupPt.lat, pickupPt.lng], [deliveryPt.lat, deliveryPt.lng]],
          { color: "#64748b", weight: 3, opacity: 0.6, dashArray: "4 8" },
        ).addTo(layer);
      }
      main.bringToFront();
      setRouteInfo(info);

      // Re-fit only when the leg itself changes, not on every GPS tick
      if (fittedKeyRef.current !== key) {
        fittedKeyRef.current = key;
        fitToRoute();
      }
    };

    // Fastest road route from our backend (A* over the valley road network)
    const params = new URLSearchParams({
      from: `${leg.from.lat},${leg.from.lng}`,
      to: `${leg.to.lat},${leg.to.lng}`,
    });

    apiFetch(`/geo/route?${params}`, { signal: controller.signal })
      .then(({ route }) => {
        if (routeAbortRef.current !== controller) return;
        draw(route.coordinates, {
          distance: formatDistance(route.distanceMeters),
          duration: formatDuration(route.durationSeconds),
          estimated: false,
        });
      })
      .catch(() => {
        // Superseded by a newer request (aborted) - nothing to do
        if (routeAbortRef.current !== controller) return;
        // Routing service unavailable: straight dashed line + rough estimate
        const meters = distanceMeters(leg.from, leg.to);
        draw(
          [[leg.from.lat, leg.from.lng], [leg.to.lat, leg.to.lng]],
          {
            distance: `~${formatDistance(meters)}`,
            duration: `~${formatDuration((meters / 1000 / FALLBACK_SPEED_KMH) * 3600)}`,
            estimated: true,
          },
          true,
        );
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leg]);

  // Abort any pending route request on unmount
  useEffect(() => () => routeAbortRef.current?.abort(), []);

  return (
    <div className="overflow-hidden rounded-xl border border-ink-200 bg-white shadow-card">
      {/* Route summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 px-4 py-3">
        <div className="flex min-w-0 items-center gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
              {leg?.label || "Route"}
            </p>
            <p className="text-sm font-bold text-ink-900">
              {routeInfo ? (
                <>
                  {routeInfo.distance}
                  <span className="mx-1.5 text-ink-300">·</span>
                  {routeInfo.duration}
                  {routeInfo.estimated && (
                    <span className="ml-2 text-xs font-medium text-ink-500">(estimate)</span>
                  )}
                </>
              ) : leg ? (
                <span className="text-ink-500">Calculating route…</span>
              ) : (
                <span className="text-ink-500">Set pickup and destination</span>
              )}
            </p>
          </div>
        </div>

        <Legend driver={!!driverPt} />
      </div>

      {/* Map canvas */}
      <div className="relative" style={{ height }}>
        <div ref={containerRef} className="h-full w-full" />
        <button
          type="button"
          onClick={fitToRoute}
          title="Recenter map"
          aria-label="Recenter map"
          className="absolute bottom-6 right-3 z-400 flex h-10 w-10 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-700 shadow-card transition hover:bg-ink-50"
        >
          <Crosshair className="h-4 w-4" />
        </button>
        {editable && (pickupPt || deliveryPt) && (
          <p className="pointer-events-none absolute left-3 top-3 z-400 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-medium text-ink-600 shadow-card">
            Drag the pins to fine-tune locations
          </p>
        )}
      </div>
    </div>
  );
};

const Legend = ({ driver }) => (
  <div className="hidden items-center gap-3 text-xs text-ink-600 sm:flex">
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> Pickup
    </span>
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full bg-rose-600" /> Destination
    </span>
    {driver && (
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-brand-600" /> Courier
      </span>
    )}
  </div>
);

export default DeliveryMap;
