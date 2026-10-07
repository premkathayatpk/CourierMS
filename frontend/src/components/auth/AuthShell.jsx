import { useState } from "react";
import { CheckCircle2, Eye, EyeOff, Package } from "lucide-react";

// Two-column auth layout: brand panel (desktop only) + form card.
export const AuthShell = ({ eyebrow, title, points, children }) => (
  <div className="flex min-h-[calc(100vh-65px)] bg-ink-50">
    <aside className="relative hidden w-[44%] max-w-xl overflow-hidden border-r border-brand-100 bg-brand-50 p-12 text-ink-900 lg:flex lg:flex-col lg:justify-between">
      <div
        aria-hidden="true"
        className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-200/60 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-accent-200/50 blur-3xl"
      />

      <div className="relative flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
          <Package className="h-5 w-5" />
        </span>
        <span className="text-lg font-extrabold tracking-tight">CourierMS</span>
      </div>

      <div className="relative">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
          {eyebrow}
        </p>
        <h2 className="mt-3 text-3xl font-extrabold leading-tight xl:text-4xl">
          {title}
        </h2>
        <ul className="mt-8 space-y-4">
          {points.map((point) => (
            <li key={point} className="flex items-start gap-3 text-sm text-ink-700">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              {point}
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-xs text-ink-500">
        Live tracking across Kathmandu Valley and beyond.
      </p>
    </aside>

    <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
      <div className="w-full max-w-md">{children}</div>
    </main>
  </div>
);

export const FormError = ({ message }) =>
  message ? (
    <div
      role="alert"
      className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
    >
      {message}
    </div>
  ) : null;

export const Field = ({ id, label, hint, children }) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="field-label">
      {label}
    </label>
    {children}
    {hint && <p className="text-xs text-ink-500">{hint}</p>}
  </div>
);

export const PasswordInput = ({ id, ...props }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        className="field-input pr-11"
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-ink-400 transition hover:text-ink-700"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
};
