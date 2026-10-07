import L from "leaflet";

// Free OpenStreetMap tiles (no API key). Respect the OSM tile usage policy:
// fine for development and small deployments; use a tile provider for heavy traffic.
export const DEFAULT_CENTER = [27.7172, 85.324]; // Kathmandu

export const addBaseTiles = (map) =>
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);
