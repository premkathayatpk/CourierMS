// Single source of truth for parcel status colours, so a status looks the
// same in every table, badge and card across the customer, driver and
// admin portals.
const STATUS_BADGE = {
  Pending: "bg-ink-100 text-ink-700 border-ink-300",
  Assigned: "bg-violet-50 text-violet-700 border-violet-200",
  "Picked Up": "bg-amber-50 text-amber-700 border-amber-200",
  "In Transit": "bg-brand-50 text-brand-700 border-brand-200",
  Delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Cancelled: "bg-rose-50 text-rose-700 border-rose-200",
};

export const statusBadgeClass = (status) =>
  STATUS_BADGE[status] || STATUS_BADGE.Pending;
