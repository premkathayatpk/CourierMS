# CourierMS

A simple courier management system (MERN). Customers book parcels, admins assign drivers, and drivers navigate with live GPS while customers follow along on a map. **Service area: Kathmandu Valley only.** Pickup and delivery must both be inside the **Kathmandu, Lalitpur or Bhaktapur** districts.

Maps are free and need no API keys: Leaflet with OpenStreetMap tiles, our own **A* road router** built on OpenStreetMap roads, and Nominatim address search through the backend.
Everything runs locally: data lives in **MongoDB on your machine** (browse it with MongoDB Compass), and photos are stored as **files in `backend/uploads/`**.

## How a delivery works

1. **Customer** books a parcel (pickup, destination, weight). The price comes from the A* road distance + weight + parcel type, with a full breakdown shown before booking.
2. **Admin** sees it on the dispatch dashboard and the fleet map, then assigns an online driver.
3. **Driver** opens **Live Route Map**. Their phone's GPS is shared automatically and the map routes:
   - **Assigned:** driver's live location → **pickup**
   - **Picked Up / In Transit:** driver's live location → **destination**
   - **Navigate** opens turn-by-turn directions in Google Maps.
4. **Customer** (or anyone with the tracking number) watches the courier move on `/track/<number>`.

Status flow: `Pending → Assigned → Picked Up → In Transit → Delivered` (or `Cancelled`).

## Quick start

Requirements: Node.js 18+ and MongoDB Community Server running locally. In MongoDB Compass, connect to `mongodb://127.0.0.1:27017` and open the `CourierMS` database.

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env        # then set JWT_SECRET to a long random string
npm run seed                # demo users + parcels
npm run dev                 # http://localhost:8000

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Open the app at **http://localhost:5173**. Use `localhost`, not `127.0.0.1`: the login cookie is only sent when both apps are on `localhost`.

### Demo accounts (password `password123`)

| Role     | Email                    |
| -------- | ------------------------ |
| Admin    | `admin@courierms.com`    |
| Driver   | `driver1@courierms.com`  |
| Driver   | `driver2@courierms.com`  |
| Customer | `customer@courierms.com` |

In development, the login page has one-click demo buttons. Demo tracking numbers: `TRK-DEMO-001` … `TRK-DEMO-004`.

> Change these credentials and `JWT_SECRET` before deploying anywhere.

## Configuration

**backend/.env**

| Variable     | Example                                 | Notes                                             |
| ------------ | --------------------------------------- | ------------------------------------------------- |
| `PORT`       | `8000`                                  |                                                   |
| `MONGO_URL`  | `mongodb://localhost:27017/CourierMS`   |                                                   |
| `JWT_SECRET` | long random string                      | Required. The server won't start without it.      |
| `CLIENT_URL` | `http://localhost:5173`                 | Comma-separated list of allowed frontend origins. |
| `NODE_ENV`   | `development`                           | `production` = Secure, SameSite=None auth cookie. |
| `UPLOAD_DIR` | `./uploads` (default `backend/uploads`) | Optional. Where uploaded images are saved.        |

**frontend/.env** (optional): `VITE_API_URL=http://localhost:8000/api`

## Algorithms

The algorithms live in [`backend/src/services/`](backend/src/services/), one file each, with unit tests in `services.test.js` (`npm test`):
- A* routing: `aStar.js`, plus `priorityQueue.js` (min-heap) and `spatialGrid.js` (road snapping)
- delivery cost estimation: `pricing.js`
- geocoding & address resolution: `addressResolution.js`
- geofence (point-in-polygon): `geofence.js`
- haversine distance: `haversine.js`

The Kalman filter for GPS smoothing, and a browser copy of haversine, are in `frontend/src/services/`.

**Map data.** `backend/data/` holds the district boundaries and the valley road graph (about 4 MB, from OpenStreetMap). To refresh it with newer roads, run:

```bash
cd backend && npm run build:geo
```

## Data & images

**Database:** local MongoDB, database `CourierMS`, with collections `users` and `parcels`.

To copy data from another MongoDB (for example an old Atlas cluster), run:

```bash
cd backend
FROM_MONGO_URL="<source uri>/CourierMS" TO_MONGO_URL="mongodb://127.0.0.1:27017/CourierMS" npm run db:copy
```

The script refuses to overwrite a non-empty target unless you pass `-- --force`.

**Images** are stored on disk, not in a cloud service:

| Photo               | Who adds it                    | Folder                       |
| ------------------- | ------------------------------ | ---------------------------- |
| Profile photo       | Any user (Profile page)        | `backend/uploads/avatars/`    |
| Package photo       | Customer, while `Pending`      | `backend/uploads/parcels/`    |
| Proof of delivery   | Assigned driver (or admin)     | `backend/uploads/deliveries/` |

How uploads work:

- The browser resizes photos to at most 1600 px (JPEG) before uploading, so files are usually under 400 KB.
- The server only accepts real JPG, PNG or WebP files (it checks the file's bytes, not its name) up to 5 MB.
- Each file gets a random name, and replacing a photo deletes the old file.
- The database stores only the path, e.g. `/uploads/avatars/<uuid>.jpg`. The backend serves files at `http://localhost:8000/uploads/...`.
- Photos never appear on the public tracking page.

`backend/uploads/` is git-ignored. Back it up together with the database.

## Tech stack

- **Backend:** Express 5, Mongoose 9 (local MongoDB), JWT in an httpOnly cookie, bcrypt, multer (image uploads to local disk)
- **Frontend:** React 19, Vite, Redux Toolkit (session only), React Router 7, Tailwind CSS 4, Leaflet, lucide-react

## API

| Method | Endpoint                            | Access                    | Purpose                                                      |
| ------ | ----------------------------------- | ------------------------- | ------------------------------------------------------------ |
| POST   | `/api/auth/register`                | Public                    | Sign up as `customer` or `driver` (admins can't self-register) |
| POST   | `/api/auth/login`                   | Public                    | Log in; sets the auth cookie (rate limited)                  |
| POST   | `/api/auth/logout`                  | Public                    | Clear the auth cookie                                        |
| GET    | `/api/user/me`                      | Logged in                 | Current user                                                 |
| PUT    | `/api/user/profile`                 | Logged in                 | Update name/phone (+ vehicle/license for drivers)            |
| PUT    | `/api/user/avatar`                  | Logged in                 | Upload profile photo (multipart field `image`)               |
| DELETE | `/api/user/avatar`                  | Logged in                 | Remove profile photo                                         |
| PATCH  | `/api/user/driver/location`         | Driver                    | Send live GPS position                                       |
| PATCH  | `/api/user/driver/status`           | Driver                    | Go online/offline (`isAvailable`)                            |
| GET    | `/api/user/drivers`                 | Admin                     | All drivers                                                  |
| GET    | `/api/user/active-drivers`          | Admin                     | Drivers with positions and active job counts (fleet map)     |
| GET    | `/api/user/all`                     | Admin                     | All users                                                    |
| POST   | `/api/parcel/create`                | Customer                  | Book a parcel                                                |
| GET    | `/api/parcel/myParcel`              | Customer                  | My parcels                                                   |
| PUT    | `/api/parcel/:id/photo`             | Customer (owner)          | Package photo, while `Pending` (multipart field `image`)      |
| PUT    | `/api/parcel/:id/delivery-photo`    | Assigned driver / Admin   | Proof of delivery, once picked up (multipart field `image`)  |
| PATCH  | `/api/parcel/cancel/:id`            | Customer / Admin          | Customers: own `Pending` parcels. Admins: any unfinished one |
| GET    | `/api/parcel/driverParcels`         | Driver                    | Parcels assigned to me                                       |
| PATCH  | `/api/parcel/status/:id`            | Driver / Admin            | Move status forward one step                                 |
| GET    | `/api/parcel/allParcel`             | Admin                     | All parcels                                                  |
| GET    | `/api/parcel/stats`                 | Admin                     | Dashboard numbers                                            |
| PATCH  | `/api/parcel/assign/:id`            | Admin                     | Assign an online driver to a `Pending`/`Assigned` parcel     |
| GET    | `/api/parcel/track/:trackingNumber` | Public                    | Tracking: masked phones, driver position only while active   |
| POST   | `/api/parcel/quote`                 | Customer                  | Price + road distance + ETA; rejects points outside the valley |
| GET    | `/api/geo/route?from=lat,lng&to=lat,lng` | Public (rate limited) | A* fastest road route (inside the valley)                   |
| GET    | `/api/geo/search?q=`                | Public (rate limited)     | Address search, valley only                                  |
| GET    | `/api/geo/reverse?lat=&lng=`        | Public (rate limited)     | Address for a point, plus whether it's in the service area   |
| GET    | `/api/geo/service-area`             | Public                    | District outlines (GeoJSON)                                  |
| GET    | `/api/parcel/:id`                   | Owner / driver / Admin    | Full parcel details                                          |

## License

MIT
