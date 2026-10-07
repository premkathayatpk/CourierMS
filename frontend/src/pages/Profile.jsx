import { useDispatch, useSelector } from "react-redux";
import { useRef, useState } from "react";
import { Camera, CheckCircle2 } from "lucide-react";
import { setUser } from "../redux/slice/userSlice";
import { apiFetch, uploadImage } from "../services/api";
import Avatar from "../components/common/Avatar";
import { Field, FormError } from "../components/auth/AuthShell";

const VEHICLES = ["Bike", "Car", "Van", "Truck"];

// One profile page for every role; drivers also manage vehicle details.
const Profile = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.user);
  const isDriver = user?.role === "driver";

  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    vehicleType: user?.vehicleType || "Bike",
    licenseNumber: user?.licenseNumber || "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const fileRef = useRef(null);

  const changePhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError("");
    try {
      const res = await uploadImage("/user/avatar", file);
      dispatch(setUser(res.user));
    } catch (err) {
      setPhotoError(err.message || "Upload failed");
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    setPhotoBusy(true);
    setPhotoError("");
    try {
      const res = await apiFetch("/user/avatar", { method: "DELETE" });
      dispatch(setUser(res.user));
    } catch (err) {
      setPhotoError(err.message || "Could not remove photo");
    } finally {
      setPhotoBusy(false);
    }
  };

  const update = (key) => (e) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setSaved(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = isDriver
        ? form
        : { name: form.name, phone: form.phone };
      const res = await apiFetch("/user/profile", {
        method: "PUT",
        body: JSON.stringify(body),
      });
      dispatch(setUser(res.user));
      setSaved(true);
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="card p-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar user={user} size="lg" className={photoBusy ? "opacity-50" : ""} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={photoBusy}
              aria-label="Change profile photo"
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-white transition hover:bg-brand-700"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={changePhoto}
              className="hidden"
            />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold text-ink-900">{user.name}</h1>
            <p className="truncate text-sm text-ink-500">{user.email}</p>
            <div className="mt-1.5 flex items-center gap-3 text-xs">
              <span className="rounded-full bg-ink-100 px-2.5 py-0.5 font-bold uppercase text-ink-600">
                {user.role}
              </span>
              {user.avatar && (
                <button
                  type="button"
                  onClick={removePhoto}
                  disabled={photoBusy}
                  className="font-semibold text-ink-500 hover:text-rose-700"
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>
        </div>
        {photoError && <p className="mt-3 text-sm text-rose-700">{photoError}</p>}
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4 p-5 sm:p-6">
        <h2 className="text-base font-bold text-ink-900">Account details</h2>
        <FormError message={error} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="profile-name" label="Full name">
            <input
              id="profile-name"
              className="field-input"
              value={form.name}
              onChange={update("name")}
              required
            />
          </Field>
          <Field id="profile-phone" label="Phone number">
            <input
              id="profile-phone"
              type="tel"
              className="field-input"
              value={form.phone}
              onChange={update("phone")}
              required
            />
          </Field>
        </div>

        <Field id="profile-email" label="Email" hint="Email can't be changed.">
          <input
            id="profile-email"
            className="field-input bg-ink-50 text-ink-500"
            value={user.email}
            disabled
          />
        </Field>

        {isDriver && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="profile-vehicle" label="Vehicle type">
              <select
                id="profile-vehicle"
                className="field-input"
                value={form.vehicleType}
                onChange={update("vehicleType")}
              >
                {VEHICLES.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="profile-license" label="License number">
              <input
                id="profile-license"
                className="field-input font-mono"
                placeholder="e.g. BA-2-PA-8899"
                value={form.licenseNumber}
                onChange={update("licenseNumber")}
              />
            </Field>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-ink-100 pt-4">
          {saved && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Saved
            </span>
          )}
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Profile;
