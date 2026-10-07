import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Bike, Car, Package, Truck, Caravan } from "lucide-react";
import { setUser } from "../redux/slice/userSlice";
import { apiFetch } from "../services/api";
import {
  AuthShell,
  Field,
  FormError,
  PasswordInput,
} from "../components/auth/AuthShell";

const ROLES = [
  {
    value: "customer",
    label: "Customer",
    caption: "Send & track parcels",
    icon: Package,
  },
  {
    value: "driver",
    label: "Driver",
    caption: "Deliver & earn",
    icon: Truck,
  },
];

const VEHICLES = [
  { value: "Bike", icon: Bike },
  { value: "Car", icon: Car },
  { value: "Van", icon: Caravan },
  { value: "Truck", icon: Truck },
];

const PANEL_COPY = {
  customer: {
    eyebrow: "For customers",
    title: "Book a pickup in minutes, follow it to the door.",
    points: [
      "Instant pricing based on weight and parcel type",
      "Live map tracking with courier ETA",
      "Shareable tracking number for your recipient",
    ],
  },
  driver: {
    eyebrow: "For drivers",
    title: "Pick up jobs near you and get on the road.",
    points: [
      "Go online or offline whenever you like",
      "Turn-by-turn route to pickup and drop-off",
      "One-tap status updates for every delivery",
    ],
  },
};

const Register = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [role, setRole] = useState("customer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [vehicleType, setVehicleType] = useState("Bike");
  const [licenseNumber, setLicenseNumber] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isDriver = role === "driver";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const data = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password,
          phone,
          role,
          ...(isDriver ? { vehicleType, licenseNumber } : {}),
        }),
      });

      dispatch(setUser(data.user));
      navigate(data.user.role === "driver" ? "/driver" : "/customer");
    } catch (error) {
      setError(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell {...PANEL_COPY[role]}>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          Choose how you&apos;ll use CourierMS. You can&apos;t switch later.
        </p>
      </div>

      {/* Role toggle */}
      <div
        role="radiogroup"
        aria-label="Account type"
        className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-ink-100 p-1"
      >
        {ROLES.map(({ value, label, caption, icon: Icon }) => {
          const active = role === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setRole(value)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                active
                  ? "bg-white shadow-card ring-1 ring-ink-200"
                  : "text-ink-500 hover:bg-white/60 hover:text-ink-800"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
                  active ? "bg-brand-600 text-white" : "bg-ink-200 text-ink-500"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span
                  className={`block text-sm font-bold ${active ? "text-ink-900" : ""}`}
                >
                  {label}
                </span>
                <span className="block text-xs leading-snug text-ink-500">
                  {caption}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormError message={error} />

        <Field id="register-name" label="Full name">
          <input
            id="register-name"
            autoComplete="name"
            type="text"
            placeholder="e.g. Sita Sharma"
            className="field-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="register-email" label="Email">
            <input
              id="register-email"
              autoComplete="email"
              type="email"
              placeholder="you@example.com"
              className="field-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>

          <Field id="register-phone" label="Phone number">
            <input
              id="register-phone"
              autoComplete="tel"
              type="tel"
              placeholder="98XXXXXXXX"
              className="field-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </Field>
        </div>

        <Field id="register-password" label="Password" hint="At least 6 characters.">
          <PasswordInput
            id="register-password"
            autoComplete="new-password"
            placeholder="Create a password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>

        {isDriver && (
          <fieldset className="space-y-4 rounded-xl border border-brand-200 bg-brand-50/60 p-4">
            <legend className="px-1 text-xs font-bold uppercase tracking-wider text-brand-700">
              Vehicle details
            </legend>

            <div>
              <span className="field-label">Vehicle type</span>
              <div className="mt-1.5 grid grid-cols-4 gap-2">
                {VEHICLES.map(({ value, icon: Icon }) => {
                  const active = vehicleType === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setVehicleType(value)}
                      className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs font-semibold transition ${
                        active
                          ? "border-brand-500 bg-white text-brand-700 ring-2 ring-brand-500/15"
                          : "border-ink-200 bg-white text-ink-600 hover:border-ink-300"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>

            <Field id="register-license" label="License number">
              <input
                id="register-license"
                type="text"
                placeholder="e.g. BA-2-PA-8899"
                className="field-input"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
              />
            </Field>
          </fieldset>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading
            ? "Creating account..."
            : `Create ${isDriver ? "driver" : "customer"} account`}
        </button>

        <p className="text-center text-sm text-ink-500">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand-700 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
};

export default Register;
