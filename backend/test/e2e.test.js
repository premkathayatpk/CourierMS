// End-to-end API test of the business rules in CLAUDE.md. Run: npm run test:e2e
//
// Self-contained: starts the app in-process on a random port against a
// throwaway local database (seeded, then dropped) and a temp uploads folder.
// It refuses to run against any database whose name doesn't end in "_tmp".
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BACKEND = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MONGO_URL = process.env.E2E_MONGO_URL || "mongodb://127.0.0.1:27017/CourierMS_e2e_tmp";
if (!/_tmp(\?|$)/.test(MONGO_URL)) {
  throw new Error(`Refusing to run E2E tests against ${MONGO_URL}: the database name must end in _tmp`);
}
const UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "courierms-e2e-"));

// Environment must be set before the app modules are loaded
process.env.MONGO_URL = MONGO_URL;
process.env.UPLOAD_DIR = UPLOAD_DIR;
await import("dotenv/config"); // JWT_SECRET from backend/.env (never overrides the values above)
process.env.JWT_SECRET ||= "e2e-test-secret";

const { default: mongoose } = await import("mongoose");
const { default: app } = await import("../src/app.js");
const { warmUpRouter } = await import("../src/services/roadRouter.js");

let server;
let API;
let ORIGIN;

before(async () => {
  await mongoose.connect(MONGO_URL);
  await mongoose.connection.dropDatabase();
  execFileSync(process.execPath, ["src/seed.js"], {
    cwd: BACKEND,
    env: { ...process.env, MONGO_URL },
    stdio: "ignore",
  });
  warmUpRouter();
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  ORIGIN = `http://127.0.0.1:${server.address().port}`;
  API = `${ORIGIN}/api`;
});

after(async () => {
  await new Promise((resolve) => server?.close(resolve));
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  fs.rmSync(UPLOAD_DIR, { recursive: true, force: true });
});

// ---------- helpers ----------
const jars = {};
const call = async (who, method, urlPath, body) => {
  const headers = {};
  if (jars[who]) headers.Cookie = jars[who];
  let payload;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(API + urlPath, { method, headers, body: payload });
  const tok = res.headers.getSetCookie().find((c) => c.startsWith("token="));
  if (tok) jars[who] = tok.split(";")[0];
  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON response
  }
  return { status: res.status, data };
};
const login = (who, email, password = "password123") =>
  call(who, "POST", "/auth/login", { email, password });
const gps = (who, latitude, longitude) =>
  call(who, "PATCH", "/user/driver/location", { latitude, longitude });
// Auto-assign retries run in the background after a GPS update
const settle = () => new Promise((r) => setTimeout(r, 700));

const THAMEL = { address: "Thamel", latitude: 27.7154, longitude: 85.3123 };
const PATAN = { address: "Patan", latitude: 27.6728, longitude: 85.3252 };
const BANESHWOR = { address: "Baneshwor", latitude: 27.6915, longitude: 85.342 };
const POKHARA = { address: "Pokhara", latitude: 28.2096, longitude: 83.9856 };
const parcelBody = (over = {}) => ({
  pickupContact: { name: "Sender", phone: "9800000001" },
  pickupLocation: THAMEL,
  deliveryContact: { name: "Receiver", phone: "9811111112" },
  deliveryLocation: BANESHWOR,
  parcelType: "Fragile",
  weight: 3,
  ...over,
});
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
const imageForm = (buf, name = "photo.png") => {
  const fd = new FormData();
  fd.append("image", new Blob([buf], { type: "image/png" }), name);
  return fd;
};

// Shared between the (sequential) tests below
const state = {};
const STAMP = Date.now();

// ---------- tests ----------
test("auth: registration rules and roles", async () => {
  let r = await call("x", "POST", "/auth/register", { name: "Wannabe", email: `adm${STAMP}@t.com`, password: "secret123", phone: "9800000000", role: "admin" });
  assert.equal(r.status, 400, "registering as admin must be rejected");
  r = await call("c2", "POST", "/auth/register", { name: "Second Customer", email: `c2${STAMP}@t.com`, password: "secret123", phone: "9800000002" });
  assert.equal(r.status, 201);
  assert.equal(r.data.user.role, "customer");
  r = await call("x", "POST", "/auth/register", { name: "Dup", email: `c2${STAMP}@t.com`, password: "secret123", phone: "9800000002" });
  assert.equal(r.status, 400, "duplicate email");
  r = await call("x", "POST", "/auth/register", { name: "Short", email: `s${STAMP}@t.com`, password: "123", phone: "9800000002" });
  assert.equal(r.status, 400, "short password");
});

test("auth: login, session check and protected routes", async () => {
  assert.equal((await login("x", "customer@courierms.com", "wrong")).status, 401);
  assert.equal((await call("anon", "GET", "/parcel/myParcel")).status, 401);
  let r = await call("anon", "GET", "/auth/session");
  assert.equal(r.status, 200, "session check never 401s");
  assert.equal(r.data.user, null);
  for (const [who, email] of [["c", "customer@courierms.com"], ["d1", "driver1@courierms.com"], ["d2", "driver2@courierms.com"], ["a", "admin@courierms.com"]]) {
    assert.equal((await login(who, email)).status, 200, email);
  }
  r = await call("c", "GET", "/auth/session");
  assert.equal(r.data.user.email, "customer@courierms.com");
  r = await call("c", "GET", "/user/me");
  assert.equal(r.data.user.email, "customer@courierms.com");
  assert.ok(!("password" in r.data.user), "password never returned");
  assert.equal((await call("c", "GET", "/parcel/allParcel")).status, 403, "customer on admin route");
  assert.equal((await call("d1", "POST", "/parcel/create", parcelBody())).status, 403, "driver cannot book");
});

test("pricing: formula, quote === create, service area, validation", async () => {
  let r = await call("c", "POST", "/parcel/quote", parcelBody());
  assert.equal(r.status, 200);
  const q = r.data.quote;
  const expected = Math.max(100, 80 + Math.round(20 * q.distanceKm) + 15 * (3 - 1) + 100);
  assert.ok(Math.abs(q.total - expected) <= 1, `max(100, 80 + 20*km + 15*(kg-1) + Fragile): ${q.total} vs ${expected}`);
  assert.equal(q.breakdown.surcharge, 100);
  state.quoteTotal = q.total;
  assert.equal((await call("c", "POST", "/parcel/quote", parcelBody({ deliveryLocation: POKHARA }))).status, 400, "outside valley");
  assert.equal((await call("c", "POST", "/parcel/quote", parcelBody({ weight: 0 }))).status, 400, "weight 0");
  assert.equal((await call("c", "POST", "/parcel/create", parcelBody({ pickupContact: { name: "" } }))).status, 400, "missing fields");
});

test("auto-assign: waits for fresh GPS, respects vehicle capacity", async () => {
  let r = await call("c", "POST", "/parcel/create", parcelBody());
  const p0 = r.data.data;
  assert.equal(p0.price, state.quoteTotal, "create price equals quote");
  assert.equal(p0.status, "Pending", "no driver has a fresh GPS fix yet");

  await gps("d1", 27.7125, 85.318);
  await settle();
  r = await call("a", "GET", `/parcel/${p0._id}`);
  assert.equal(r.data.data.status, "Assigned", "retried when the bike driver's GPS arrived");
  assert.equal(r.data.data.driver.vehicleType, "Bike");

  r = await call("c", "POST", "/parcel/create", parcelBody());
  state.p1 = r.data.data;
  assert.equal(state.p1.status, "Assigned", "assigned instantly at booking");

  r = await call("c", "POST", "/parcel/create", parcelBody({ weight: 50, parcelType: "Other", pickupLocation: PATAN }));
  const heavy = r.data.data;
  assert.equal(heavy.status, "Pending", "a bike cannot take 50 kg");

  r = await call("a", "GET", "/user/active-drivers");
  const bike = r.data.drivers.find((d) => d.vehicleType === "Bike");
  const van = r.data.drivers.find((d) => d.vehicleType === "Van");
  assert.equal(bike.maxLoadKg, 20);
  assert.equal(van.maxLoadKg, 500);
  assert.equal((await call("a", "PATCH", `/parcel/assign/${heavy._id}`, { driverId: bike._id })).status, 400, "manual assign over capacity");

  await gps("d2", 27.675, 85.32);
  await settle();
  r = await call("a", "GET", `/parcel/${heavy._id}`);
  assert.equal(r.data.data.driver?.vehicleType, "Van", "heavy parcel went to the van");

  await call("d2", "PATCH", "/user/driver/status", { isAvailable: false });
  assert.equal((await call("a", "PATCH", `/parcel/assign/${state.p1._id}`, { driverId: van._id })).status, 400, "offline driver");
  await call("d2", "PATCH", "/user/driver/status", { isAvailable: true });
});

test("access: GET /parcel/:id only for owner, assigned driver, admin (others 404)", async () => {
  const id = state.p1._id;
  await login("c2", `c2${STAMP}@t.com`, "secret123");
  assert.equal((await call("c2", "GET", `/parcel/${id}`)).status, 404, "other customer");
  assert.equal((await call("d2", "GET", `/parcel/${id}`)).status, 404, "unassigned driver");
  assert.equal((await call("c", "GET", `/parcel/${id}`)).status, 200, "owner");
  const r = await call("a", "GET", "/parcel/not-an-id");
  assert.equal(r.status, 404);
  assert.equal(r.data.success, false);
});

test("images: validation, permissions, safe serving", async () => {
  const id = state.p1._id;
  let r = await call("c", "PUT", `/parcel/${id}/photo`, imageForm(PNG));
  assert.equal(r.status, 200, "owner uploads before pickup");
  const photo = r.data.data.photo;
  assert.match(photo, /^\/uploads\/parcels\/[0-9a-f-]{36}\.png$/, "random UUID file name");
  const img = await fetch(ORIGIN + photo);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get("x-content-type-options"), "nosniff");

  r = await call("c", "PUT", `/parcel/${id}/photo`, imageForm(Buffer.from("<script>alert(1)</script>"), "evil.png"));
  assert.equal(r.status, 400, "wrong magic bytes");
  r = await call("c", "PUT", `/parcel/${id}/photo`, imageForm(Buffer.concat([PNG, Buffer.alloc(5.5 * 1024 * 1024)])));
  assert.equal(r.status, 400, "over 5 MB");
  assert.equal((await call("c2", "PUT", `/parcel/${id}/photo`, imageForm(PNG))).status, 404, "not the owner");
  assert.equal((await call("d1", "PUT", `/parcel/${id}/delivery-photo`, imageForm(PNG))).status, 400, "proof before pickup");
});

test("status machine: one step at a time, assigned driver only, final states", async () => {
  const id = state.p1._id;
  const assigned = (await call("a", "GET", `/parcel/${id}`)).data.data.driver;
  const mine = assigned.vehicleType === "Bike" ? "d1" : "d2";
  const other = mine === "d1" ? "d2" : "d1";
  state.driver = mine;

  assert.equal((await call(other, "PATCH", `/parcel/status/${id}`, { status: "Picked Up" })).status, 403, "not the assigned driver");
  assert.equal((await call(mine, "PATCH", `/parcel/status/${id}`, { status: "In Transit" })).status, 400, "skipping a step");
  assert.equal((await call(mine, "PATCH", `/parcel/status/${id}`, { status: "Cancelled" })).status, 400, "drivers cannot cancel");
  assert.equal((await call(mine, "PATCH", `/parcel/status/${id}`, { status: "Picked Up" })).status, 200);
  assert.equal((await call("c", "PATCH", `/parcel/cancel/${id}`)).status, 400, "customer cancel after pickup");
  assert.equal((await call("c", "PUT", `/parcel/${id}/photo`, imageForm(PNG))).status, 400, "package photo locked after pickup");
  assert.equal((await call(mine, "PUT", `/parcel/${id}/delivery-photo`, imageForm(PNG))).status, 200, "proof after pickup");
  assert.equal((await call(mine, "PATCH", `/parcel/status/${id}`, { status: "In Transit" })).status, 200);
});

test("public tracking: masked, no customer, no photos, driver phone only while active", async () => {
  const { trackingNumber, _id: id } = state.p1;
  let r = await call("anon", "GET", `/parcel/track/${trackingNumber}`);
  assert.equal(r.status, 200);
  const body = JSON.stringify(r.data);
  const t = r.data.data;
  assert.ok(!("customer" in t), "no customer object");
  assert.ok(body.includes("98******01") && !body.includes("9800000001"), "phones masked");
  assert.ok(!body.includes("/uploads/"), "no photos");
  assert.ok(t.driver?.phone, "driver phone while In Transit");

  assert.equal((await call(state.driver, "PATCH", `/parcel/status/${id}`, { status: "Delivered" })).status, 200);
  r = await call("anon", "GET", `/parcel/track/${trackingNumber}`);
  assert.ok(!r.data.data.driver?.phone, "driver phone hidden after delivery");
  assert.equal((await call("a", "PATCH", `/parcel/status/${id}`, { status: "Cancelled" })).status, 400, "Delivered is final");
  assert.equal((await call("anon", "GET", "/parcel/track/TRK-NOPE")).status, 404);
});

test("cancel: owner before pickup, admin anytime unfinished, nobody else", async () => {
  let r = await call("c", "POST", "/parcel/create", parcelBody());
  const p = r.data.data;
  r = await call("c2", "PATCH", `/parcel/cancel/${p._id}`);
  assert.ok([403, 404].includes(r.status), "other customer");
  r = await call("c", "PATCH", `/parcel/cancel/${p._id}`);
  assert.equal(r.status, 200, `owner cancels while ${p.status}`);
  assert.equal(r.data.data.status, "Cancelled");
  r = await call("c", "POST", "/parcel/create", parcelBody());
  assert.equal((await call("a", "PATCH", `/parcel/cancel/${r.data.data._id}`)).status, 200, "admin cancel");
});

test("admin stats, A* routing, service area, 404s, logout", async () => {
  assert.equal((await call("a", "GET", "/parcel/stats")).status, 200);
  let r = await call("anon", "GET", "/geo/route?from=27.7154,85.3123&to=27.6728,85.3252");
  assert.equal(r.status, 200);
  const route = r.data.route || r.data;
  assert.ok(route.coordinates.length > 10, "road geometry returned");
  assert.equal((await call("anon", "GET", "/geo/route?from=27.7154,85.3123&to=28.2096,83.9856")).status, 400, "outside valley");
  assert.equal((await call("anon", "GET", "/geo/service-area")).status, 200);
  r = await call("anon", "GET", "/does-not-exist");
  assert.equal(r.status, 404);
  assert.equal(r.data.success, false);
  await call("c", "POST", "/auth/logout");
  assert.equal((await call("c", "GET", "/user/me")).status, 401, "logout clears session");
});
