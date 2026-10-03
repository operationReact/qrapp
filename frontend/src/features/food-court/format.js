// Pure helpers for the Food Court feature: currency/date formatting, month
// option generation and client-side KPI derivation. Keeping these pure makes
// the dashboard resilient — KPIs render from whatever entity lists resolve,
// even when the backend summary endpoint is unavailable.

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return currencyFormatter.format(amount);
}

export function formatNumber(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat("en-IN").format(amount);
}

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// "YYYY-MM" for the current month.
export function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthLabel(value) {
  if (!value) return "—";
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

// Last `count` months (including current) as { value, label } selector options.
export function buildMonthOptions(count = 12) {
  const options = [];
  const now = new Date();
  for (let index = 0; index < count; index += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    options.push({ value, label: formatMonthLabel(value) });
  }
  return options;
}

const sumBy = (rows, selector) =>
  (rows || []).reduce((total, row) => {
    const value = Number(selector(row));
    return total + (Number.isFinite(value) ? value : 0);
  }, 0);

const normalize = (value) => String(value || "").toUpperCase();

export function isStallOccupied(stall) {
  const status = normalize(stall?.status);
  if (status) return status === "OCCUPIED";
  return Boolean(stall?.tenantId || stall?.tenant);
}

export function isStallAvailable(stall) {
  const status = normalize(stall?.status);
  if (status) return status === "AVAILABLE" || status === "VACANT";
  return !isStallOccupied(stall);
}

export function rentDue(rent) {
  return Number(rent?.amountDue ?? rent?.rentAmount ?? rent?.amount ?? 0) || 0;
}

export function rentPaid(rent) {
  return Number(rent?.amountPaid ?? rent?.paidAmount ?? 0) || 0;
}

export function rentStatus(rent) {
  const explicit = normalize(rent?.status);
  if (explicit) return explicit;
  const due = rentDue(rent);
  const paid = rentPaid(rent);
  if (paid >= due && due > 0) return "PAID";
  if (paid > 0) return "PARTIAL";
  return "UNPAID";
}

export function isRentOverdue(rent) {
  const status = rentStatus(rent);
  if (status === "PAID") return false;
  if (status === "OVERDUE") return true;
  const dueDate = rent?.dueDate ? new Date(rent.dueDate) : null;
  if (dueDate && !Number.isNaN(dueDate.getTime())) {
    return dueDate.getTime() < Date.now() && rentPaid(rent) < rentDue(rent);
  }
  return false;
}

export function isActionOpen(item) {
  const status = normalize(item?.status);
  return status !== "DONE" && status !== "COMPLETED" && status !== "CLOSED" && status !== "CANCELLED";
}

// Derives the full KPI set from the loaded entity lists. A backend-provided
// `summary` object (if present) always wins over the derived values.
export function deriveKpis({
  stalls = [],
  tenants = [],
  leases = [],
  rents = [],
  expenses = [],
  actionItems = [],
  summary = null,
} = {}) {
  const stallCount = stalls.length;
  const occupied = stalls.filter(isStallOccupied).length;
  const available = stalls.filter(isStallAvailable).length;

  const monthlyTenantRent = rents.length
    ? sumBy(rents, rentDue)
    : sumBy(tenants, (tenant) => tenant?.monthlyRent ?? tenant?.rentAmount);
  const collected = sumBy(rents, rentPaid);
  const outstanding = Math.max(monthlyTenantRent - collected, 0);

  const landlordLease = sumBy(
    (leases || []).filter((lease) => {
      const type = normalize(lease?.type ?? lease?.leaseType);
      return type ? type === "LANDLORD" : true;
    }),
    (lease) => lease?.monthlyAmount ?? lease?.monthlyRent ?? lease?.amount,
  );

  const grossRentSpread = monthlyTenantRent - landlordLease;
  const totalExpenses = sumBy(expenses, (expense) => expense?.amount);
  const netContribution = grossRentSpread - totalExpenses;
  const overdueRents = rents.filter(isRentOverdue).length;
  const openActions = actionItems.filter(isActionOpen).length;
  const collectionRate = monthlyTenantRent > 0 ? (collected / monthlyTenantRent) * 100 : 0;

  const derived = {
    stallCount,
    occupied,
    available,
    monthlyTenantRent,
    collected,
    outstanding,
    landlordLease,
    grossRentSpread,
    totalExpenses,
    netContribution,
    overdueRents,
    openActions,
    collectionRate,
  };

  if (summary && typeof summary === "object") {
    return { ...derived, ...pruneUndefined(summary) };
  }
  return derived;
}

function pruneUndefined(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined && value !== null),
  );
}
