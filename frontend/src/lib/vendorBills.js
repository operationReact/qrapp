export const VENDOR_BILL_STATUS = {
  DRAFT: { label: "Draft", className: "bg-slate-100 text-slate-700" },
  SUBMITTED: { label: "Awaiting review", className: "bg-amber-100 text-amber-800" },
  CORRECTION_REQUESTED: { label: "Correction needed", className: "bg-rose-100 text-rose-700" },
  APPROVED: { label: "Approved · unpaid", className: "bg-sky-100 text-sky-800" },
  PAID: { label: "Paid", className: "bg-emerald-100 text-emerald-800" },
};

export const VENDOR_BILL_EVENT_LABELS = {
  CREATED: "Created",
  SUBMITTED: "Submitted for review",
  COMMENT: "Comment",
  CORRECTION_REQUESTED: "Correction requested",
  APPROVED: "Approved",
  PAID: "Payment recorded",
};

export const EDITABLE_VENDOR_BILL_STATUSES = ["DRAFT", "CORRECTION_REQUESTED"];

const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

export function formatInr(value) {
  return currency.format(Number(value || 0));
}

export function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export function lineTotal(quantity, unitPrice) {
  return Number(quantity || 0) * Number(unitPrice || 0);
}

export function latestCorrectionMessage(bill) {
  const corrections = (bill?.events || []).filter((event) => event.eventType === "CORRECTION_REQUESTED");
  return corrections.length ? corrections[corrections.length - 1].message : null;
}
