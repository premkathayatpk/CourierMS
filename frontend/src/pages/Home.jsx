import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Package,
  Truck,
  MapPin,
  ShieldCheck,
  Compass,
  Zap,
  Clock,
  CheckCircle,
  ArrowRight,
  Search,
} from "lucide-react";
import heroImage from "../assets/hero.jpg"; // photo: Unsplash (free license)

const Home = () => {
  const { user } = useSelector((state) => state.user);
  const [trackingNumber, setTrackingNumber] = useState("");
  const navigate = useNavigate();

  const handleTracking = (event) => {
    event.preventDefault();
    const trackingId = trackingNumber.trim();
    if (trackingId) navigate(`/track/${encodeURIComponent(trackingId)}`);
  };

  const getDashLink = () => {
    if (!user) return null;
    switch (user.role) {
      case "admin":
        return "/admin";
      case "driver":
        return "/driver";
      default:
        return "/customer";
    }
  };

  const features = [
    {
      icon: MapPin,
      color: "blue",
      title: "Live Route Tracking",
      desc: "Follow delivery routes with OpenStreetMap routing and live courier location updates.",
    },
    {
      icon: Truck,
      color: "indigo",
      title: "Driver Fleet Management",
      desc: "Assign couriers, track delivery vehicles live on the map, update availability status, and broadcast GPS positions.",
    },
    {
      icon: ShieldCheck,
      color: "amber",
      title: "Admin Dispatch Control",
      desc: "Full logistics command center: oversee every order, assign drivers, monitor KPIs, and manage the entire fleet.",
    },
    {
      icon: Compass,
      color: "emerald",
      title: "Parcel Tracking Portal",
      desc: "Customers track deliveries in real-time with order status timeline, courier info, and interactive route maps.",
    },
    {
      icon: Zap,
      color: "rose",
      title: "Instant Price Calculator",
      desc: "Transparent automated freight pricing based on package type, weight, and delivery route distance.",
    },
    {
      icon: Clock,
      color: "purple",
      title: "Real-Time Status Updates",
      desc: "Live status transitions from Pending → Assigned → Picked Up → In Transit → Delivered with timestamps.",
    },
  ];

  const steps = [
    {
      number: "01",
      title: "Book a Courier",
      desc: "Enter pickup & delivery details, select package type, and confirm your order in under 2 minutes.",
    },
    {
      number: "02",
      title: "Driver Gets Dispatched",
      desc: "Our logistics team assigns an available driver who picks up your parcel from the source address.",
    },
    {
      number: "03",
      title: "Track Live on Map",
      desc: "Watch your courier navigate in real-time on the interactive map from pickup to your door.",
    },
    {
      number: "04",
      title: "Delivery Confirmed",
      desc: "Receive instant confirmation when the parcel reaches its destination.",
    },
  ];

  const colorMap = {
    blue: "bg-brand-50 text-brand-700 border-brand-200",
    indigo: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-accent-50 text-accent-700 border-accent-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    purple: "bg-ink-100 text-ink-600 border-ink-300",
  };

  return (
    <div className="overflow-x-hidden">
      {/* ── HERO ── */}
      <section
        className="relative flex min-h-155 items-center overflow-hidden bg-ink-900 bg-cover bg-center text-white sm:min-h-170"
        style={{
          backgroundImage: `url(${heroImage})`,
        }}
      >
        <div className="absolute inset-0 bg-ink-950/70" />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 lg:px-12">
          <div className="max-w-3xl">
            <p className="mb-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-accent-400">
              <span className="h-px w-8 bg-accent-400" />
              Local delivery, clearly handled
            </p>
            <h1 className="mb-5 text-5xl font-extrabold leading-[1.02] sm:text-6xl lg:text-7xl">
              CourierMS
              <span className="mt-2 block text-3xl font-semibold leading-tight text-white/90 sm:text-4xl lg:text-5xl">
                Your delivery, in motion.
              </span>
            </h1>
            <p className="mb-8 max-w-xl text-base leading-7 text-white/80 sm:text-lg">
              Book a pickup, follow every milestone, and know when your parcel
              arrives. One straightforward place for customers, couriers, and
              dispatch teams.
            </p>

            <form
              onSubmit={handleTracking}
              className="mb-5 flex max-w-xl flex-col gap-2 rounded-lg bg-white p-2 sm:flex-row"
            >
              <label htmlFor="home-tracking-number" className="sr-only">
                Tracking number
              </label>
              <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
                <Search className="h-5 w-5 shrink-0 text-ink-600" />
                <input
                  id="home-tracking-number"
                  value={trackingNumber}
                  onChange={(event) => setTrackingNumber(event.target.value)}
                  placeholder="Enter your tracking number"
                  className="min-w-0 flex-1 border-0 bg-transparent py-3 text-sm text-ink-900 outline-none placeholder:text-ink-500"
                  required
                />
              </div>
              <button
                type="submit"
                className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-brand-600 px-6 text-sm font-bold text-white transition hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                Track parcel <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/80">
              {user ? (
                <Link
                  to={getDashLink()}
                  className="inline-flex items-center gap-2 font-semibold text-white hover:text-accent-400"
                >
                  Go to your {user.role} portal{" "}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 font-semibold text-white hover:text-accent-400"
                  >
                    Create an account <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/login"
                    className="underline decoration-white/40 underline-offset-4 hover:text-white"
                  >
                    Sign in
                  </Link>
                </>
              )}
              <span className="hidden h-4 w-px bg-white/30 sm:block" />
              <span>Live delivery updates</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="bg-ink-50 py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="rounded-sm border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold uppercase text-brand-700">
              Platform Features
            </span>
            <h2 className="mt-4 mb-3 text-3xl font-black text-ink-900 sm:text-4xl">
              Everything You Need for
              <br />
              <span className="text-brand-700">Smart Logistics</span>
            </h2>
            <p className="text-ink-500 text-sm max-w-xl mx-auto">
              A complete end-to-end courier management system built for modern
              fleets.
            </p>
          </div>

          <div className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="group border-t border-ink-200 py-7 transition-colors hover:border-brand-500 sm:px-2"
                >
                  <div
                    className={`mb-4 flex h-11 w-11 items-center justify-center rounded-md border ${colorMap[f.color]}`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="mb-2 text-base font-bold text-ink-900">
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-ink-500">
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="border-y border-brand-100 bg-brand-50 py-20 text-ink-900 sm:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="rounded-sm border border-brand-200 bg-white px-3 py-1 text-xs font-bold uppercase text-brand-700">
              How It Works
            </span>
            <h2 className="text-3xl sm:text-4xl font-black mt-4 mb-3">
              Four Simple Steps to
              <span className="text-brand-600"> Reliable Delivery</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={i} className="relative">
                {i < steps.length - 1 && (
                  <div className="absolute top-8 left-full z-0 hidden h-px w-full bg-brand-200 lg:block" />
                )}
                <div className="relative z-10 space-y-3">
                  <div className="font-mono text-4xl font-black text-brand-300">
                    {s.number}
                  </div>
                  <h3 className="text-base font-black text-ink-900">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-ink-600">
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── USER ROLE SECTIONS ── */}
      <section className="bg-white py-20 sm:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-ink-900">
              Built for Every Role
            </h2>
            <p className="text-ink-500 text-sm mt-3">
              Tailored experiences for customers, couriers, and fleet
              administrators.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                icon: Package,
                role: "Customer",
                color: "blue",
                desc: "Book deliveries, track packages live on interactive maps, view delivery history, and get instant price estimates.",
                bullets: [
                  "Book & manage shipments",
                  "Live map route tracking",
                  "Real-time status updates",
                  "Cancel pending bookings",
                ],
                link: "/register",
                cta: "Start Sending",
              },
              {
                icon: Truck,
                role: "Courier Driver",
                color: "indigo",
                desc: "Accept delivery tasks, navigate with OpenStreetMap turn-by-turn road routing, and broadcast your live GPS position.",
                bullets: [
                  "Assigned task manager",
                  "Live turn-by-turn navigation",
                  "GPS position broadcasting",
                  "Status update workflow",
                ],
                link: "/register",
                cta: "Join as Driver",
              },
              {
                icon: ShieldCheck,
                role: "Fleet Admin",
                color: "amber",
                desc: "Command center for all logistics operations — manage drivers, assign parcels, monitor revenues, and track the whole fleet.",
                bullets: [
                  "Dispatch parcels to drivers",
                  "Live fleet activity overview",
                  "Revenue & KPI dashboard",
                  "Customer & driver registry",
                ],
                link: "/login",
                cta: "Admin Access",
              },
            ].map((item) => {
              const Icon = item.icon;
              const bgColor = {
                blue: "bg-brand-600",
                indigo: "bg-emerald-700",
                amber: "bg-accent-600",
              }[item.color];

              return (
                <div
                  key={item.role}
                  className="overflow-hidden border border-ink-200 bg-ink-50 transition-colors hover:border-ink-300"
                >
                  <div className={`${bgColor} px-6 py-8 text-white`}>
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-white/20">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-black">{item.role}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/80">
                      {item.desc}
                    </p>
                  </div>

                  <div className="space-y-4 p-6">
                    <ul className="space-y-3">
                      {item.bullets.map((b) => (
                        <li
                          key={b}
                          className="flex items-center gap-2 text-sm text-ink-600"
                        >
                          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-700" />
                          {b}
                        </li>
                      ))}
                    </ul>

                    <Link
                      to={item.link}
                      className={`mt-2 block w-full rounded-md py-3 text-center text-sm font-bold text-white transition hover:opacity-90 ${bgColor}`}
                    >
                      {item.cta}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <section className="bg-brand-600 py-20 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-black mb-4">
            Ready to Experience Next-Gen Courier Tracking?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-sm text-white/85">
            Start tracking parcels in real time with OpenStreetMap road routing,
            courier navigation, and instant live updates — all in one platform.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register"
              className="rounded-md bg-white px-8 py-3.5 text-sm font-bold text-brand-700 transition hover:bg-brand-50"
            >
              Create Free Account
            </Link>
            <Link
              to="/track"
              className="rounded-md border border-white/50 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Track a Package
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink-200 bg-white py-8 text-center text-xs text-ink-500">
        <p>
          © {new Date().getFullYear()}{" "}
          <span className="font-bold text-ink-900">CourierMS</span> — Smart parcel
          delivery and fleet logistics.
        </p>
      </footer>
    </div>
  );
};

export default Home;
