/**
 * Uniform grid spatial index (supporting data structure).
 *
 * The map is divided into square cells (cellDeg × cellDeg degrees). Each item
 * is stored in every cell its bounding box touches. A nearest-neighbour query
 * scans the query cell, then rings of cells further out, and stops once the
 * ring is farther away than the best match found so far.
 *
 * Build: O(n). Query: ~O(k) where k = items in the few cells inspected,
 * instead of O(n) for a linear scan over ~400k road segments.
 *
 * Used by: snapping a pickup/delivery point to the nearest road (A* router),
 * nearest known place for reverse geocoding.
 */
export class SpatialGrid {
  constructor(cellDeg = 0.005) {
    this.cellDeg = cellDeg; // ~550 m at Kathmandu's latitude
    this.cells = new Map();
  }

  key(cx, cy) {
    return cx * 100000 + cy;
  }

  cellOf(lat, lng) {
    return [Math.floor(lng / this.cellDeg), Math.floor(lat / this.cellDeg)];
  }

  /** Insert an item covering the bounding box [minLat, minLng, maxLat, maxLng]. */
  insert(item, minLat, minLng, maxLat = minLat, maxLng = minLng) {
    const [x0, y0] = this.cellOf(minLat, minLng);
    const [x1, y1] = this.cellOf(maxLat, maxLng);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const k = this.key(cx, cy);
        let bucket = this.cells.get(k);
        if (!bucket) this.cells.set(k, (bucket = []));
        bucket.push(item);
      }
    }
  }

  /**
   * Find the item with the smallest distance to (lat, lng).
   *   distanceFn(item) -> metres
   *   maxRings: how far to search (rings of cells) before giving up
   * Returns { item, distance } or null.
   */
  nearest(lat, lng, distanceFn, maxRings = 6) {
    const [cx, cy] = this.cellOf(lat, lng);
    // Minimum distance (m) from the query point to any cell in ring r is at
    // least (r - 1) cells; 1 degree latitude ≈ 111 km.
    const cellMeters = this.cellDeg * 111000 * Math.cos((lat * Math.PI) / 180);
    let best = null;
    const seen = new Set();

    for (let r = 0; r <= maxRings; r++) {
      if (best && (r - 1) * cellMeters > best.distance) break;
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; // ring only
          const bucket = this.cells.get(this.key(cx + dx, cy + dy));
          if (!bucket) continue;
          for (const item of bucket) {
            if (seen.has(item)) continue;
            seen.add(item);
            const d = distanceFn(item);
            if (!best || d < best.distance) best = { item, distance: d };
          }
        }
      }
    }
    return best;
  }
}
