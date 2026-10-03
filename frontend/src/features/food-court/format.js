// Pure formatting + derivation helpers for the Food Court feature. Field names
// mirror the backend DTOs (StallResponse.currentTenantName, RentInvoiceResponse.balanceDue, ...).

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
};

export const num = (value) => toNumber(value) ?? 0;

export function formatCurrency(value) {
  const amount = toNumber(value);
  return amount === null ? "—" : inrFormatter.format(amount);
}

// ₹1.27L, ₹77K, ₹950 — used where space is tight.
export function formatCompactCurrency(value) {
  const amount = toNumber(value);
  if (amount === null) return "—";
  const abs = Math.abs(amount);
  const trim = (n) => String(Number(n.toFixed(2)));
  if (abs >= 1e7) return `₹${trim(amount / 1e7)}Cr`;
  if (abs >= 1e5) return `₹${trim(amount / 1e5)}L`;
  if (abs >= 1e4) return `₹${trim(amount / 1e3)}K`;
  return inrFormatter.format(amount);
}

const parseDate = (value) => {
  if (!value) return null;
  // Bare dates (yyyy-MM-dd) are parsed as local dates to avoid a one-day shift.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export function formatDate(value) {
  const date = parseDate(value);
  return date ? date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
}

export function formatShortDate(value) {
  const date = parseDate(value);
  return date ? date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—";
}

export function formatDateRange(start, end) {
  return `${formatDate(start)} – ${end ? formatDate(end) : "ongoing"}`;
}

const pad = (n) => String(n).padStart(2, "0");

export function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function addDaysISO(iso, days) {
  const date = parseDate(iso) ?? new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export const daysFromToday = (iso) => {
  const date = parseDate(iso);
  if (!date) return null;
  const today = parseDate(todayISO());
  return Math.round((date.getTime() - today.getTime()) / 86_400_000);
};

export function currentMonthValue() {
  return todayISO().slice(0, 7);
}

export function shiftMonth(value, delta) {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function formatMonthLabel(value) {
  const [year, month] = (value || "").split("-").map(Number);
  if (!year || !month) return "—";
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function buildMonthOptions(selected, count = 18) {
  const start = currentMonthValue();
  const values = new Set([selected]);
  for (let index = -3; index < count; index += 1) values.add(shiftMonth(start, -index));
  return [...values].sort().reverse().map((value) => ({ value, label: formatMonthLabel(value) }));
}

export const titleCase = (value) =>
  String(value || "")
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export const PAYMENT_METHOD_LABELS = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  UPI: "UPI",
  CHEQUE: "Cheque",
  ASSET: "Asset / Vehicle",
  OTHER: "Other",
};
export const paymentMethodLabel = (value) => PAYMENT_METHOD_LABELS[value] || titleCase(value) || "—";

// Stalls ---------------------------------------------------------------

export const STALL_TONES = {
  OCCUPIED: "success",
  VACANT: "info",
  RESERVED: "warning",
  MAINTENANCE: "danger",
};

// A stall is occupied only when it has an active lease today; the stored status
// is used for the other states (maintenance, reserved, vacant).
export function stallState(stall) {
  if (stall?.occupied) return "OCCUPIED";
  const status = stall?.status;
  if (status === "MAINTENANCE" || status === "RESERVED") return status;
  return "VACANT";
}

export const stallTitle = (stall) => `Unit ${stall?.code ?? "—"}`;

// Rent ------------------------------------------------------------------

export function invoiceStatus(invoice) {
  const status = invoice?.status;
  if (status === "PAID" || status === "WAIVED" || status === "CANCELLED") return status;
  if (num(invoice?.balanceDue) > 0 && invoice?.dueDate) {
    const days = daysFromToday(invoice.dueDate);
    if (days !== null && days < 0) return "OVERDUE";
  }
  return status || "PENDING";
}

export function invoiceOverdueDays(invoice) {
  if (invoiceStatus(invoice) !== "OVERDUE") return 0;
  const reported = num(invoice?.overdueDays);
  if (reported > 0) return reported;
  const days = daysFromToday(invoice?.dueDate);
  return days !== null && days < 0 ? Math.abs(days) : 0;
}

export const RENT_TONES = {
  PAID: "success",
  WAIVED: "muted",
  CANCELLED: "muted",
  PARTIALLY_PAID: "warning",
  DUE_SOON: "warning",
  PENDING: "info",
  OVERDUE: "danger",
};

export const rentStatusLabel = (invoice) => {
  const status = invoiceStatus(invoice);
  if (status === "OVERDUE") {
    const days = invoiceOverdueDays(invoice);
    return days > 0 ? `Overdue ${days}d` : "Overdue";
  }
  return titleCase(status);
};

export const canPay = (invoice) =>
  !["PAID", "WAIVED", "CANCELLED"].includes(invoice?.status) && num(invoice?.balanceDue) > 0;

// Joins ------------------------------------------------------------------

export const isActiveLease = (lease) => lease?.status === "ACTIVE";

export function indexBy(rows, key) {
  const map = new Map();
  (rows || []).forEach((row) => map.set(row[key], row));
  return map;
}

// Stall rows combine stall + its active lease + tenant + this month's invoice.
export function buildStallRows({ stalls, leases, tenants, invoices }) {
  const leaseById = indexBy(leases, "id");
  const tenantById = indexBy(tenants, "id");
  const invoiceByLease = indexBy(invoices, "stallLeaseId");
  return (stalls || []).map((stall) => {
    const lease = stall.currentLeaseId ? leaseById.get(stall.currentLeaseId) ?? null : null;
    const tenant = stall.currentTenantId ? tenantById.get(stall.currentTenantId) ?? null : null;
    const invoice = lease ? invoiceByLease.get(lease.id) ?? null : null;
    return {
      stall,
      state: stallState(stall),
      lease,
      tenant,
      tenantName: stall.currentTenantName || tenant?.businessName || tenant?.name || null,
      monthlyRent: stall.currentMonthlyRent ?? lease?.monthlyRent ?? null,
      invoice,
    };
  });
}

// Tenant rows combine tenant + the active (or latest) lease + stall + invoice.
export function buildTenantRows({ tenants, leases, stalls, invoices }) {
  const stallById = indexBy(stalls, "id");
  const invoiceByLease = indexBy(invoices, "stallLeaseId");
  return (tenants || []).map((tenant) => {
    const own = (leases || []).filter((lease) => lease.tenantId === tenant.id);
    const lease = own.find(isActiveLease) ?? own[0] ?? null;
    return {
      tenant,
      lease,
      stall: lease ? stallById.get(lease.stallId) ?? null : null,
      invoice: lease ? invoiceByLease.get(lease.id) ?? null : null,
    };
  });
}

export const tenantDisplayName = (tenant) => tenant?.businessName || tenant?.name || "Tenant";

export function depositBalance(deposit) {
  return Math.max(num(deposit?.amount) - num(deposit?.refundedAmount), 0);
}

export function sumInvoices(invoices, field) {
  return (invoices || []).reduce((total, invoice) => total + num(invoice?.[field]), 0);
}

export const ACTION_OPEN = ["OPEN", "IN_PROGRESS", "BLOCKED"];
export const isActionOpen = (item) => ACTION_OPEN.includes(item?.status);
export const isActionOverdue = (item) =>
  isActionOpen(item) && item?.dueDate && (daysFromToday(item.dueDate) ?? 0) < 0;
export const isActionDueToday = (item) => isActionOpen(item) && item?.dueDate && daysFromToday(item.dueDate) === 0;
