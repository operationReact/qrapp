import { ROLE, userRoles } from "./roles.js";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SHORT_MONTHS = MONTHS.map((month) => month.slice(0, 3));
const EMPTY = "\u2014";
const RUPEE = "\u20B9";

export const SETTLEMENT_STATUSES = ["DRAFT", "CALCULATED", "APPROVED", "PAID", "VOID"];

export const STATUS_META = {
  DRAFT: { label: "Draft", tone: "neutral", hint: "Created, not calculated yet" },
  CALCULATED: { label: "Calculated", tone: "blue", hint: "Calculated, awaiting approval" },
  APPROVED: { label: "Approved", tone: "gold", hint: "Approved, awaiting payment" },
  PAID: { label: "Paid", tone: "green", hint: "Payment recorded" },
  VOID: { label: "Void", tone: "red", hint: "Cancelled" },
};

export const ADJUSTMENT_TYPES = [
  { value: "MANUAL_CREDIT", label: "Manual credit", effect: "Increases the net payable" },
  { value: "MANUAL_DEBIT", label: "Manual debit", effect: "Reduces the net payable" },
  { value: "REFUND_ADJUSTMENT", label: "Refund adjustment", effect: "Reduces the net payable" },
];

const ADJUSTMENT_LABELS = Object.fromEntries(ADJUSTMENT_TYPES.map((type) => [type.value, type]));

const BASIS_LABELS = { GROSS_SALES: "Gross sales", NET_SALES: "Net sales", ELIGIBLE_SALES: "Eligible sales" };
const TAX_LABELS = { DEFERRED: "Deferred", NOT_APPLICABLE: "Not applicable" };
const AGREEMENT_STATUS_LABELS = { ACTIVE: "Active", VOID: "Void" };

const ERROR_MESSAGES = {
  access_denied: "You do not have permission to do that.",
  invalid_request: "Some of the details are invalid. Please review and try again.",
  concurrent_modification: "This settlement was changed by someone else. Refresh and try again.",
  settlement_not_found: "That settlement could not be found.",
  no_current_commission_agreement: "No commission agreement is currently in effect.",
  no_commission_agreement_for_period: "No commission agreement covers this period, so it cannot be calculated.",
  settlement_period_required: "Choose a settlement period.",
  settlement_period_invalid: "That settlement period is not valid.",
  settlement_period_in_future: "That period has not started yet.",
  settlement_already_exists_for_period: "A settlement already exists for this period.",
  settlement_not_recalculable: "Only draft or calculated settlements can be recalculated.",
  settlement_not_open_for_adjustments: "Adjustments can only be added to draft or calculated settlements.",
  adjustment_amount_invalid: "Enter a valid adjustment amount.",
  adjustment_makes_net_payable_negative: "This adjustment would make the net payable negative.",
  settlement_not_calculated: "The settlement must be calculated before it can be approved.",
  settlement_period_not_closed: "The settlement period has not closed yet, so it cannot be approved.",
  settlement_net_payable_negative: "A settlement with a negative net payable cannot be approved.",
  settlement_not_approved: "The settlement must be approved before it can be marked paid.",
  paid_on_in_future: "The payment date cannot be in the future.",
  paid_on_before_period_end: "The payment date cannot be before the settlement period ends.",
  settlement_source_changed_retry: "Order data changed while calculating. Please try again.",
  settlement_stale_recalculate_required: "Order data has changed since the last calculation. Recalculate before approving.",
};

export function statusMeta(status) {
  return STATUS_META[status] || { label: status || EMPTY, tone: "neutral", hint: "" };
}

export function adjustmentMeta(type) {
  return ADJUSTMENT_LABELS[type] || { value: type, label: type || EMPTY, effect: "" };
}

export const commissionBasisLabel = (basis) => BASIS_LABELS[basis] || basis || EMPTY;
export const taxTreatmentLabel = (treatment) => TAX_LABELS[treatment] || treatment || EMPTY;
export const agreementStatusLabel = (status) => AGREEMENT_STATUS_LABELS[status] || status || EMPTY;

function plainDecimal(value) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return /e/i.test(String(value)) ? value.toFixed(2) : String(value);
  }
  return String(value).trim();
}

function groupIndian(digits) {
  if (digits.length <= 3) return digits;
  const head = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${head},${digits.slice(-3)}`;
}

/** Formats a backend decimal as INR from its string form, so no arithmetic or float rounding is involved. */
export function formatInr(value) {
  if (value === null || value === undefined || value === "") return EMPTY;
  const text = plainDecimal(value);
  const match = text ? /^(-?)(\d+)(?:\.(\d+))?$/.exec(text) : null;
  if (!match) return EMPTY;
  const [, sign, whole, fraction = ""] = match;
  if (fraction.length > 2) {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(text));
  }
  const negative = sign && /[1-9]/.test(whole + fraction);
  return `${negative ? "-" : ""}${RUPEE}${groupIndian(whole)}.${fraction.padEnd(2, "0")}`;
}

export function formatPercent(value) {
  if (value === null || value === undefined || value === "") return EMPTY;
  return `${plainDecimal(value) ?? EMPTY}%`;
}

export function formatCount(value) {
  if (value === null || value === undefined) return EMPTY;
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatPeriod(period) {
  const match = /^(\d{4})-(\d{2})$/.exec(period || "");
  if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) return period || EMPTY;
  return `${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}

export function formatDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || "");
  if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) return EMPTY;
  return `${Number(match[3])} ${SHORT_MONTHS[Number(match[2]) - 1]} ${match[1]}`;
}

export function formatDateTime(value) {
  if (!value) return EMPTY;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return EMPTY;
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
  }).format(date);
}

export function businessToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}

/** Newest-first list of YYYY-MM periods ending at the current business month. */
export function recentPeriods(count = 12, today = businessToday()) {
  let year = Number(today.slice(0, 4));
  let month = Number(today.slice(5, 7));
  const periods = [];
  for (let index = 0; index < count; index += 1) {
    periods.push(`${year}-${String(month).padStart(2, "0")}`);
    month -= 1;
    if (month === 0) { month = 12; year -= 1; }
  }
  return periods;
}

export const isValidPeriod = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value || "");

export function canManageFinance(user) {
  return userRoles(user).includes(ROLE.PARTNER_ADMIN);
}

/** UI hints only; the backend remains the authority on every transition. */
export function settlementActions(status) {
  const open = status === "DRAFT" || status === "CALCULATED";
  return {
    recalculate: open,
    adjust: open,
    approve: status === "CALCULATED",
    markPaid: status === "APPROVED",
    void: open || status === "APPROVED",
  };
}

export function parseAmountInput(text) {
  const value = String(text ?? "").trim();
  if (!/^\d{1,15}(\.\d{1,2})?$/.test(value)) return null;
  return /[1-9]/.test(value) ? value : null;
}

export function financeErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  const data = error?.response?.data;
  const code = data?.code;
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  if (error?.response?.status === 403) return ERROR_MESSAGES.access_denied;
  if (error?.response?.status === 404) return "That item could not be found.";
  if (!error?.response) return "Unable to reach the server. Check your connection and try again.";
  return fallback;
}

export function statementFilename(settlement) {
  return `settlement-${settlement?.period || "statement"}-${settlement?.id ?? ""}.pdf`.replace(/-\.pdf$/, ".pdf");
}
