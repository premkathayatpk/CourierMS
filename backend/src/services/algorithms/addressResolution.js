
import { distanceBetween } from "./haversine.js";

const ABBREVIATIONS = {
  rd: "road",
  st: "street",
  chk: "chowk",
  ktm: "kathmandu",
  ltp: "lalitpur",
  bkt: "bhaktapur",
  tia: "tribhuvan international airport",
};

/** "  Pulchowk Rd., LTP " -> "pulchowk road lalitpur" */
export const normalizeAddress = (text = "") =>
  String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // punctuation -> space (keeps Devanagari)
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => ABBREVIATIONS[word] || word)
    .join(" ");


export const scorePlaceMatch = (query, placeName) => {
  const q = normalizeAddress(query);
  const name = normalizeAddress(placeName);
  if (!q || !name) return 0;
  if (name === q) return 100;
  if (name.startsWith(q)) return 85;

  const qWords = q.split(" ");
  const nameWords = name.split(" ");
  if (qWords.every((w) => nameWords.includes(w))) return 70;
  if (qWords.every((w) => nameWords.some((nw) => nw.startsWith(w)))) return 55;
  if (name.includes(q)) return 40;
  return 0;
};


export const rankAndDedupe = (candidates, { isInside = () => true, dedupeMeters = 100, limit = 8 } = {}) => {
  const sorted = candidates
    .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng) && isInside(c.lat, c.lng))
    .sort((a, b) => b.score - a.score);

  const kept = [];
  for (const c of sorted) {
    if (kept.some((k) => distanceBetween(k, c) < dedupeMeters)) continue;
    kept.push(c);
    if (kept.length === limit) break;
  }
  return kept;
};


export const nearestPlace = (lat, lng, places) => {
  let best = null;
  for (const place of places) {
    const meters = distanceBetween({ lat, lng }, place);
    if (!best || meters < best.meters) best = { place, meters };
  }
  return best;
};
