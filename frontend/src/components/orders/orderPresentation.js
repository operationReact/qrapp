import {
  ArchiveIcon,
  CheckCircleIcon,
  ClockIcon,
  CookingPotIcon,
  PackageIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";

const ORDER_STATUS_META = {
  ORDER_PLACED: {
    label: "Order placed",
    icon: PackageIcon,
    tone: "border-amber-200 bg-amber-50 text-amber-800",
    step: 0,
  },
  PLACED: {
    label: "Order placed",
    icon: PackageIcon,
    tone: "border-amber-200 bg-amber-50 text-amber-800",
    step: 0,
  },
  PREPARING: {
    label: "Being prepared",
    icon: CookingPotIcon,
    tone: "border-orange-200 bg-orange-50 text-orange-800",
    step: 1,
  },
  READY: {
    label: "Ready",
    icon: CheckCircleIcon,
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
    step: 2,
  },
  COMPLETED: {
    label: "Completed",
    icon: CheckCircleIcon,
    tone: "border-slate-200 bg-slate-50 text-slate-700",
    step: 3,
  },
  CANCELLED: {
    label: "Cancelled",
    icon: XCircleIcon,
    tone: "border-red-200 bg-red-50 text-red-800",
    step: null,
  },
};

const PAYMENT_STATUS_META = {
  REFUNDED: {
    label: "Refunded",
    icon: CheckCircleIcon,
    tone: "border-slate-200 bg-slate-50 text-slate-700",
  },
  PAID: {
    label: "Paid",
    icon: CheckCircleIcon,
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  PENDING: {
    label: "Payment pending",
    icon: ClockIcon,
    tone: "border-amber-200 bg-amber-50 text-amber-800",
  },
  PROCESSING: {
    label: "Payment processing",
    icon: ClockIcon,
    tone: "border-blue-200 bg-blue-50 text-blue-800",
  },
  PAYMENT_PROCESSING: {
    label: "Payment Processing",
    icon: ClockIcon,
    tone: "border-blue-200 bg-blue-50 text-blue-800",
  },
  FAILED: {
    label: "Payment Failed",
    icon: WarningCircleIcon,
    tone: "border-red-200 bg-red-50 text-red-800",
  },
};

const FALLBACK_ORDER_STATUS = {
  label: "Order update",
  icon: ArchiveIcon,
  tone: "border-border bg-muted text-muted-foreground",
  step: null,
};

const FALLBACK_PAYMENT_STATUS = {
  label: "Pending",
  icon: ClockIcon,
  tone: "border-amber-200 bg-amber-50 text-amber-800",
};

export const ORDER_STATUS_FILTER_ORDER = [
  "ALL",
  "ORDER_PLACED",
  "PREPARING",
  "READY",
  "COMPLETED",
  "CANCELLED",
];

export function normalizeOrderStatus(status) {
  const normalized = String(status ?? "").trim().toUpperCase();
  return normalized === "PLACED" ? "ORDER_PLACED" : normalized;
}

export function getOrderStatusMeta(status) {
  return ORDER_STATUS_META[normalizeOrderStatus(status)] || FALLBACK_ORDER_STATUS;
}

export function normalizePaymentStatus(status) {
  return String(status ?? "PENDING").trim().toUpperCase();
}

export function getPaymentStatusMeta(status) {
  return PAYMENT_STATUS_META[normalizePaymentStatus(status)] || FALLBACK_PAYMENT_STATUS;
}

export function getStatusFilterLabel(status) {
  if (status === "ALL") return "All";
  return getOrderStatusMeta(status).label;
}

export function formatOrderDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatOrderTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}
