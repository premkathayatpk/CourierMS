import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setUser } from "../redux/slice/userSlice";
import { apiFetch } from "../services/api";
import {
  AuthShell,
  Field,
  FormError,
  PasswordInput,
} from "../components/auth/AuthShell";

// Seeded demo accounts (see backend/src/seed.js). Only offered in dev builds.
const DEMO_ACCOUNTS = [
  { label: "Customer", email: "customer@courierms.com" },
  { label: "Driver", email: "driver1@courierms.com" },
  { label: "Admin", email: "admin@courierms.com" },
];

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      dispatch(setUser(data.user));
      const home = { admin: "/admin", driver: "/driver", customer: "/customer" };
      navigate(home[data.user.role] || "/");
    } catch (error) {
      setError(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword("password123");
    setError("");
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Every parcel, every courier, one live map."
      points={[
        "Customers book and follow deliveries in real time",
        "Drivers manage jobs and share live GPS",
        "Admins dispatch the whole fleet from one place",
      ]}
    >
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
          Log in
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          Sign in to your CourierMS account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormError message={error} />

        <Field id="email" label="Email">
          <input
            className="field-input"
            type="email"
            id="email"
            autoComplete="email"
            value={email}
            placeholder="you@example.com"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>

        <Field id="password" label="Password">
          <PasswordInput
            id="password"
            autoComplete="current-password"
            value={password}
            placeholder="Your password"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>

        <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
          {loading ? "Logging in..." : "Log in"}
        </button>

        <p className="text-center text-sm text-ink-500">
          New to CourierMS?{" "}
          <Link to="/register" className="font-semibold text-brand-700 hover:underline">
            Create an account
          </Link>
        </p>
      </form>

      {import.meta.env.DEV && (
        <div className="mt-8 rounded-xl border border-dashed border-ink-300 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-500">
            Demo accounts
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => fillDemo(acc.email)}
                className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthShell>
  );
};

export default Login;
