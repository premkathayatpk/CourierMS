import { useEffect, useRef } from "react";
import L from "leaflet";
import { Crosshair } from "lucide-react";
import { toPoint } from "../../utils/route";
import { DEFAULT_CENTER, addBaseTiles } from "../../utils/mapTiles";


const TRUCK_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>`;
const BOX_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/></svg>`;

const icon = (html) =>
  L.divIcon({ className: "", html, iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -18] });

const popup = (lines) => {
  const el = document.createElement("div");
  el.className = "map-popup";
  lines.forEach((text, i) => {
    const node = document.createElement(i === 0 ? "strong" : "p");
    node.textContent = text;
    el.appendChild(node);
  });
  return el;
};

/**
 * Admin fleet overview: every courier with a known position (orange when
 * online, grey when offline) plus pickups that are still waiting for a driver.
 */
const FleetMap = ({ drivers = [], pendingParcels = [], height = "420px" }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const fittedRef = useRef(false);

  useEffect(() => {
    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      zoomControl: false,
    });
    L.control.zoom({ position: "topright" }).addTo(map);
    addBaseTiles(map);
    layerRef.current = L.featureGroup().addTo(map);
    mapRef.current = map;

    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      map.remove();
    };
  }, []);

  const fitAll = () => {
    const bounds = layerRef.current?.getBounds();
    if (bounds?.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  };

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();

    drivers.forEach((d) => {
      const pt = toPoint(d.currentLocation);
      if (!pt) return;
      const online = d.isAvailable;
      L.marker([pt.lat, pt.lng], {
        icon: icon(
          `<div class="map-pin ${online ? "map-pin--driver" : "map-pin--offline"}">${TRUCK_SVG}</div>`,
        ),
        zIndexOffset: 1000,
      })
        .bindPopup(
          popup([
            d.name,
            `${d.vehicleType || "Bike"} · ${online ? "Online" : "Offline"}`,
            `${d.activeParcels || 0} active job${d.activeParcels === 1 ? "" : "s"}`,
          ]),
        )
        .addTo(layer);
    });

    pendingParcels.forEach((p) => {
      const pt = toPoint(p.pickupLocation);
      if (!pt) return;
      L.marker([pt.lat, pt.lng], {
        icon: icon(`<div class="map-pin map-pin--pickup">${BOX_SVG}</div>`),
      })
        .bindPopup(popup([`Awaiting driver · ${p.trackingNumber}`, pt.address]))
        .addTo(layer);
    });

    // Frame everything once; later refreshes keep the admin's current view
    if (!fittedRef.current && layer.getLayers().length) {
      fittedRef.current = true;
      fitAll();
    }
  }, [drivers, pendingParcels]);

  const online = drivers.filter((d) => d.isAvailable).length;

  return (
    <div className="overflow-hidden rounded-xl border border-ink-200 bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 px-4 py-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-500">
            Fleet map
          </p>
          <p className="text-sm font-bold text-ink-900">
            {online} of {drivers.length} couriers online · {pendingParcels.length} awaiting pickup
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-ink-600">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-600" /> Online
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-ink-400" /> Offline
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> Pending pickup
          </span>
        </div>
      </div>
      <div className="relative" style={{ height }}>
        <div ref={containerRef} className="h-full w-full" />
        <button
          type="button"
          onClick={fitAll}
          title="Show everything"
          aria-label="Show everything"
          className="absolute bottom-6 right-3 z-400 flex h-10 w-10 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-700 shadow-card transition hover:bg-ink-50"
        >
          <Crosshair className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default FleetMap;
