/**
 * Geocoding & address resolution — turning what a user types into a
 * ranked list of real places (and coordinates back into an address).
 *
 * Steps for a search:
 *   1. normalizeAddress   lower-case, strip punctuation, expand common
 *                         abbreviations ("rd" → "road", "ktm" → "kathmandu")
 *   2. scorePlaceMatch    score known places: exact > prefix > all words
 *                         present > word prefixes > substring
 *   3. external geocoder  (Nominatim, bounded to the valley) for anything the
 *                         local list doesn't know
 *   4. rankAndDedupe      drop results outside the service area, merge results
 *                         closer than ~100 m (haversine), sort by score
 *
 * Reverse geocoding: cached Nominatim lookup, falling back to the nearest
 * known place ("Near Patan Durbar Square") or raw coordinates.
 *
 * All functions here are pure; network calls live in services/geocoder.js.
 */
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

/**
 * Score how well a known place name matches a normalized query (0 = no match).
 *   100 exact name
 *    85 name starts with the query
 *    70 every query word appears in the name
 *    55 every query word is a prefix of some name word
 *    40 query appears anywhere in the name
 */
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

/**
 * Merge candidate lists into a single ranked list.
 *   candidates: [{ name, lat, lng, score, source }]
 *   isInside(lat, lng): service-area check (geofence)
 * Higher score wins; among near-duplicates (< dedupeMeters apart) the best is kept.
 */
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

/**
 * Nearest known place to a point (linear scan; the place list is small).
 * Returns { place, meters } or null.
 */
export const nearestPlace = (lat, lng, places) => {
  let best = null;
  for (const place of places) {
    const meters = distanceBetween({ lat, lng }, place);
    if (!best || meters < best.meters) best = { place, meters };
  }
  return best;
};
