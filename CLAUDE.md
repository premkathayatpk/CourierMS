# CourierMS — project memory

Courier management app (MERN). Three roles: **customer** books parcels, **admin** assigns drivers, **driver** navigates with live GPS. **Service area:** pickup and delivery are allowed only inside the Kathmandu, Lalitpur and Bhaktapur districts (OSM relations 4583247, 4583253, 4583251). This is enforced in `services/quote.js` via `services/geofence.js`.

**Storage is fully local.**
- Data lives in MongoDB at `mongodb://127.0.0.1:27017/CourierMS`; the user browses it in Compass. It was migrated from Atlas on 2026-10-01, and the old Atlas URI is kept commented out in `backend/.env` as `MONGO_URL_ATLAS`.
- Images are files under `backend/uploads/`. Cloudinary is not used.

## Commands

```bash
# backend (port 8000)
cd backend && npm run dev        # nodemon src/server.js
cd backend && npm run seed       # idempotent: demo users + TRK-DEMO-001..004
cd backend && npm run db:copy    # FROM_MONGO_URL -> TO_MONGO_URL (refuses non-empty target without -- --force)
cd backend && npm test           # algorithm unit tests (node:test)
cd backend && npm run test:e2e   # full API test: in-process server + throwaway CourierMS_e2e_tmp DB (refuses non-_tmp DBs)
cd frontend && npm test          # Kalman filter / haversine tests
cd backend && npm run build:geo  # re-download boundaries + road graph into backend/data (Overpass + Nominatim)

# frontend (port 5173)
cd frontend && npm run dev
cd frontend && npm run build     # must pass before finishing frontend work
cd frontend && npm run lint      # oxlint; keep it at 0 warnings except the known userSlice false positive
```

`npm run test:e2e` covers every business rule below (auth, pricing, auto-assign, access, images, status machine, tracking, cancel); run it after backend changes. For manual checks, verify backend changes against a **throwaway database** by setting `MONGO_URL=mongodb://127.0.0.1:27017/CourierMS_<something>_tmp`, a different `PORT`, then running `npm run seed` and the server, then dropping that DB. Never point experiments at the real `CourierMS` DB.

## Layout

```
backend/src
  server.js            loads env FIRST (`import "dotenv/config"`), then app; exits if no JWT_SECRET/DB
  app.js               cors (CLIENT_URL list), json, cookies, routes, JSON 404 + error handler
  models/              User (role, vehicleType, isAvailable, currentLocation{latitude,longitude}), Parcel
  controllers/         auth, parcel (status machine, tracking), user (profile, GPS, fleet)
  middleware/          protect (cookie or Bearer JWT), authorize(...roles), rateLimit (in-memory),
                       upload (imageUpload(folder) + removeStoredImage)
  scripts/copyDb.js    copy all collections + indexes between MongoDB URIs
  scripts/buildGeoData.js  builds data/valley-boundary.json + data/road-graph.json (contracted junction graph)
  services/            roadRouter (A* + snapping), geocoder (Nominatim + local places, no cache), serviceArea, quote
                       autoAssign (DB side), pricing (formula; pricing.test.js)
  services/algorithms/ pure algorithms, no DB/network (tests in algorithms.test.js):
                       aStar, priorityQueue, spatialGrid, haversine, geofence, addressResolution, driverAssignment
  config/pricing.js    pricing rates (the only place to change prices)
  config/fleet.js      vehicle capacity + auto-assign tuning
data/                  valley-boundary.json (~30 KB), road-graph.json (~4 MB) — committed, rebuild with build:geo
uploads/               local image files (git-ignored): avatars/, parcels/, deliveries/
  utils/               calculatePrice, genTrackingNum, tokenGen
frontend/src
  config.js            BaseApi from VITE_API_URL; fileUrl("/uploads/..") -> absolute image URL
  services/api.js      apiFetch(): credentials:"include", throws Error(message) on non-2xx; FormData-aware
                       uploadImage(endpoint, file): compress in browser, PUT multipart "image"
  utils/image.js       compressImage: max 1600px JPEG q0.85 via canvas
  components/common/Avatar.jsx, PhotoInput.jsx   profile photo / photo picker with preview
  services/geocoding.js Nominatim search/reverse (rate-limited to 1 req/s) + preset hubs fallback
  utils/route.js       toPoint, getRouteLeg, getNextStop, directionsUrl, distance/duration formatting
  services/algorithms/ kalmanFilter.js, haversine.js (GPS smoothing, distance helper; tests in algorithms.test.js)
  utils/status.js      statusBadgeClass(status): the ONLY place status colors are defined
  utils/mapTiles.js    shared OSM tile layer + DEFAULT_CENTER
  components/common/DeliveryMap.jsx  single-parcel map (all roles)
  components/common/FleetMap.jsx     admin overview of drivers + pending pickups
  components/auth/AuthShell.jsx      auth layout + Field / FormError / PasswordInput helpers
  pages/Profile.jsx    one profile page for all roles (drivers also edit vehicle/license)
  routes/AppRoute.jsx  lazy-loaded portal pages behind CustomerRoute/DriverRoute/AdminRoute guards
```

## Business rules (enforced in backend — keep frontend in sync)

- **Registration:** only `customer` or `driver`. Admins come from the seed script or the DB.
- **Parcel status machine** (`parcel.controller.js`):
  - Driver (must be the assigned one): `Assigned → Picked Up → In Transit → Delivered`, one step at a time.
  - Admin: the same forward steps, plus `Cancelled` from any unfinished state.
  - `Delivered`/`Cancelled` are final.
- **Auto-assign** (added 2026-10-07 at the user's request). Pure ranking in `services/algorithms/driverAssignment.js`, DB side in `services/autoAssign.js`, tuning in `config/fleet.js`.
  - Candidates: online, GPS updated within 15 min (`User.locationUpdatedAt`), < 5 active jobs, vehicle can carry the weight (Bike 20 / Car 100 / Van 500 / Truck 1000 kg).
  - Shortlist 5 nearest by haversine; score = A* road seconds to pickup + 600 s per active job.
  - Runs on create (failure never fails the booking), and retries oldest `Pending` parcels when a driver goes online, on a driver's first fresh GPS fix, and every 30 s.
  - Manual assign also rejects vehicles that can't carry the weight; `/user/active-drivers` returns `maxLoadKg`.
- **Assign (manual):** admin only; parcel must be `Pending`/`Assigned`; the driver must be online (`isAvailable`).
- **Cancel:** customers can cancel their own parcels before pickup (`Pending`/`Assigned`); admins can cancel any unfinished one.
- **`GET /parcel/:id`:** only the owner customer, the assigned driver, or an admin. Anyone else gets 404, not 403.
- **Public `GET /parcel/track/:trackingNumber`:** no customer object, masked contact phones; driver phone and location only while `Assigned/Picked Up/In Transit`.
- **Price:** computed only on the backend (`quoteDelivery`), and identical for `/parcel/quote` and `/parcel/create`.
  - Formula: max(100, 80 + 20×roadKm + 15×(kg−1) + type surcharge), with Fragile +100 and Electronics +50.
  - Road km comes from A*. If no route is found, it falls back to haversine × 1.3.
  - `distanceKm` and `priceBreakdown` are stored on the parcel.
  - The user chose no surge or peak pricing; don't add it without asking.
- **Images:**
  - Upload rules:
    - Profile photo: any logged-in user.
    - Package `photo`: the owner customer, before pickup (`Pending`/`Assigned`).
    - `deliveryPhoto`: the assigned driver or an admin, once `Picked Up` / `In Transit` / `Delivered`.
    - Photos are never included in the public tracking response.
  - Server-side checks:
    - Validates magic bytes (JPG/PNG/WebP) and a 5 MB limit.
    - Uses random UUID file names.
    - Deletes the old file on replace, and the new file if the request fails.
    - Serves `/uploads` statically with `nosniff`.
  - The DB stores only the relative path.

## Map / navigation behaviour

- **Routing is our own A*** (`GET /api/geo/route`). OSRM was removed at the user's request. Since 2026-10-07 A* minimises **distance** (shortest path, small lanes included, heuristic = haversine metres); `durationSeconds` is computed afterwards from per-road-type speeds. The graph has no `service`/`track`/`path` ways (would need `build:geo` changes).
  - The road graph loads at startup (~150 ms).
  - Routes take ~1–5 ms. Points outside the valley return 400, and the map falls back to a dashed straight line.
- **Driver GPS** goes through `createGpsKalmanFilter` before it's shown or sent.
- **Algorithm policy:** the user wants to be **asked before adding any new algorithm**. They declined fuzzy search and multi-stop TSP; driver auto-assignment was approved 2026-10-07 (nearest + workload). On 2026-10-06 they had the `algorithms/` folders removed: the LRU geocoding cache was dropped, the parcel state machine was inlined into `parcel.controller.js`, and the rate limiter/throttle was inlined into `rateLimit.middleware.js` and `geocoder.js`. On 2026-10-07 they asked for a `services/algorithms/` folder (backend and frontend) holding only the pure algorithm files; services that touch DB/network stay in `services/`.
- `getRouteLeg` decides what to route:
  - `Assigned` + driver GPS → driver → pickup (with a dashed pickup → destination hint)
  - `Picked Up`/`In Transit` + driver GPS → driver → destination
  - otherwise → pickup → destination
- **DeliveryMap:**
  - Moves markers in place and re-requests the A* route only when the leg changes or the origin moves ≥ 60 m. It re-fits the view only on leg change, so the user's zoom isn't fought on every GPS tick.
  - Falls back to a dashed straight line and a 25 km/h estimate when routing fails.
  - Popups are built with `textContent`, never HTML strings (addresses are user input, so HTML strings would be an XSS hole).
- **Driver page (`DriverLiveDelivery`):**
  - GPS lives in `components/driver/DriverGpsProvider.jsx` (wraps `DriverLayout`, read via `useDriverGps`): shares automatically while the driver is **online** or has active jobs; Stop/Share override until the next online toggle. Sidebar shows a GPS chip.
  - Sends `PATCH /user/driver/location` at most every 3 s and polls jobs every 15 s.
  - `?parcel=<id>` preselects a job.
  - "Navigate" opens Google Maps directions (`directionsUrl`).
- **Polling:** the tracking page polls every 4 s, ParcelDetails every 5 s (only while active), and the admin dashboard every 15 s. All skip polling while the tab is hidden.
- **Tiles:** standard OSM (`tile.openstreetmap.org`). CARTO basemaps now require an API key, so don't switch to them.

## Conventions

- **Auth** = httpOnly `token` cookie only. Never store the JWT in localStorage. App start-up restores the session via `GET /api/auth/session` (always 200, `user: null` when logged out, so no console 401).
  - In dev, open the app on `localhost` (not `127.0.0.1`), or the cookie isn't sent.
  - `NODE_ENV=production` switches the cookie to `SameSite=None; Secure`.
- **Design tokens** live in `frontend/src/index.css` (`@theme`):
  - Colors (simple light-blue theme, chosen 2026-10-07): `brand-*` (blue; use `brand-600` for filled buttons, it passes contrast), `ink-*` (cool slate neutrals), `accent-*` (light sky). Status colors come from `utils/status.js`. Map line colours in `DeliveryMap.jsx` and the favicon/theme-color in `index.html` are hard-coded to match brand-600.
  - Don't use raw hex values or Tailwind `slate`/`gray`/`blue` in JSX.
  - Reusable utilities: `card`, `btn-primary`, `btn-secondary`, `field-input`, `field-label`.
- **Base CSS must stay inside `@layer base`.** Unlayered rules (e.g. `button { font: inherit }`) override Tailwind utilities and silently break `text-*` and `font-*` on buttons and inputs.
- **Backend errors:** `{ success: false, message }`. Return 400 on validation, 404 on not found or CastError, and never leak `error.message` on 500.
- Redux holds only the session user (`state.user`). Pages fetch their own data with `apiFetch`.
- Match the surrounding code style: functional components, Tailwind classes inline, lucide-react icons.

## Gotchas

- The user usually has `npm run dev` (nodemon on :8000, Vite on :5173) running. Don't start test servers on those ports or kill those processes. On Windows, a second server can bind :8000 alongside theirs (IPv4 vs IPv6) and intercept their traffic.
- Editing `backend/package.json` or `src/` makes the user's nodemon restart. That's expected.
- In Git Bash, arguments starting with `/` get path-converted (`/customer` → `C:/Program Files/Git/customer`). Set `MSYS_NO_PATHCONV=1` when passing URL paths to scripts.
- Headless Chrome enforces a minimum window width of about 500 px. Use DevTools-protocol device metrics emulation to check true mobile widths.
