import { formatCount, formatDate, formatInr, formatPercent } from "./partnerFinance.js";

export const REPORT_MAX_RANGE_DAYS = 365;
const DAY_MS = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const REPORT_PRESETS = [
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["last7", "Last 7 Days"],
  ["last30", "Last 30 Days"],
  ["thisMonth", "This Month"],
  ["lastMonth", "Last Month"],
  ["custom", "Custom"],
];

/** Static presentation metadata; availability always comes from the backend catalog. */
export const REPORT_META = {
  sales: { title: "Sales & Orders", locationScoped: true, detail: { to: "/partner/performance", label: "Open performance" } },
  locations: { title: "Location Performance", locationScoped: true, detail: { to: "/partner/performance", label: "Open performance" } },
  menu: { title: "Menu & Vendor Performance", locationScoped: true, detail: { to: "/partner/performance", label: "Open performance" } },
  engagement: { title: "Employee Engagement", locationScoped: true, detail: { to: "/partner/insights", label: "Open insights" } },
  finance: { title: "Finance & Settlements", locationScoped: false, detail: { to: "/partner/finance/settlements", label: "View settlement statements" } },
  feedback: { title: "Feedback & Complaints", locationScoped: false, detail: null },
};

export const REPORT_TYPES = ["sales", "locations", "menu", "engagement", "finance", "feedback"];

export function businessToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}

export const isIsoDate = (value) => {
  const match = ISO_DATE.exec(value || "");
  if (!match) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export function shiftDate(date, days) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function monthStart(date, offset = 0) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(1);
  value.setUTCMonth(value.getUTCMonth() + offset);
  return value.toISOString().slice(0, 10);
}

export function monthEnd(date, offset = 0) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(1);
  value.setUTCMonth(value.getUTCMonth() + offset + 1);
  value.setUTCDate(0);
  return value.toISOString().slice(0, 10);
}

/** Resolves a preset key to an inclusive Asia/Kolkata date range. Unknown keys fall back to the custom range. */
export function resolveRange(preset, today, custom = {}) {
  switch (preset) {
    case "today": return { startDate: today, endDate: today };
    case "yesterday": { const day = shiftDate(today, -1); return { startDate: day, endDate: day }; }
    case "last7": return { startDate: shiftDate(today, -6), endDate: today };
    case "last30": return { startDate: shiftDate(today, -29), endDate: today };
    case "thisMonth": return { startDate: monthStart(today), endDate: today };
    case "lastMonth": return { startDate: monthStart(today, -1), endDate: monthEnd(today, -1) };
    default: return { startDate: custom.startDate || "", endDate: custom.endDate || "" };
  }
}

/** Returns a user-facing message for an unusable range, or null when the range is valid. */
export function validateRange({ startDate, endDate }, today, maxDays = REPORT_MAX_RANGE_DAYS) {
  if (!startDate || !endDate) return "Choose both a start and an end date.";
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) return "Enter valid dates.";
  if (startDate > endDate) return "The start date must be on or before the end date.";
  if (endDate > today) return "The end date cannot be in the future.";
  const days = Math.round((Date.parse(`${endDate}T12:00:00Z`) - Date.parse(`${startDate}T12:00:00Z`)) / DAY_MS) + 1;
  if (days > maxDays) return `Reports can cover at most ${maxDays} days.`;
  return null;
}

export function formatRangeLabel({ startDate, endDate }) {
  if (!startDate || !endDate) return "";
  return startDate === endDate ? formatDate(startDate) : `${formatDate(startDate)} \u2013 ${formatDate(endDate)}`;
}

/** Builds the backend query params. Partner-level reports never receive a location filter. */
export function reportParams({ locationId, startDate, endDate }, type) {
  const scoped = type ? REPORT_META[type]?.locationScoped !== false : true;
  return { locationId: scoped && locationId ? Number(locationId) : undefined, from: startDate, to: endDate };
}

export function formatTotal(total) {
  if (!total || total.value === null || total.value === undefined) return "\u2014";
  if (total.unit === "CURRENCY_INR") return formatInr(total.value);
  if (total.unit === "PERCENT") return formatPercent(total.value);
  return formatCount(total.value);
}

export function reportFilename(type, { from, to }, extension) {
  return `partner-${type}-report-${from}-to-${to}.${extension}`;
}

export function executiveFilename({ from, to }) {
  return `partner-executive-report-${from}-to-${to}.pdf`;
}

/** Strips path separators and unsafe characters so a server-provided name can never escape the downloads folder. */
export function safeFilename(name, fallback) {
  const cleaned = String(name || "")
    .replace(/[\\/]+/g, "-")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^[.-]+/, "")
    .slice(0, 120);
  return cleaned || fallback;
}

export function filenameFromDisposition(header) {
  if (!header) return null;
  const encoded = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
  if (encoded) {
    try { return decodeURIComponent(encoded[1].trim()); } catch { /* fall through to the plain filename */ }
  }
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(header);
  return plain ? plain[1].trim() : null;
}

export function responseFilename(response, fallback) {
  const headers = response?.headers;
  const header = typeof headers?.get === "function" ? headers.get("content-disposition") : headers?.["content-disposition"];
  return safeFilename(filenameFromDisposition(header), fallback);
}

/** Saves a Blob through a temporary anchor; environment pieces are injectable so it can be unit tested. */
export function downloadBlob(blob, filename, mimeType, env = {}) {
  const doc = env.document || document;
  const urlApi = env.URL || URL;
  const schedule = env.setTimeout || setTimeout;
  const BlobCtor = env.Blob || Blob;
  const file = blob instanceof BlobCtor && blob.type ? blob : new BlobCtor([blob], { type: mimeType });
  const url = urlApi.createObjectURL(file);
  const link = doc.createElement("a");
  link.href = url;
  link.download = safeFilename(filename, "report");
  link.rel = "noopener";
  doc.body.appendChild(link);
  link.click();
  link.remove();
  schedule(() => urlApi.revokeObjectURL(url), 1000);
  return link.download;
}

const ERROR_MESSAGES = {
  report_period_invalid: "That reporting period is not supported.",
  report_range_inverted: "The start date must be on or before the end date.",
  report_range_in_future: "The end date cannot be in the future.",
  report_range_too_long: "That date range is too long. Choose a shorter range.",
  report_type_not_found: "That report does not exist.",
  report_unavailable: "That report is not available yet.",
  report_too_large: "That report is too large to export. Choose a shorter range or a single location.",
};

export function reportErrorMessage(error, fallback = "The report could not be loaded. Please try again.") {
  const code = error?.response?.data?.code || error?.response?.data?.message;
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  if (error?.response?.status === 403) return "You do not have permission to view this report.";
  if (!error?.response) return "Unable to reach the server. Check your connection and try again.";
  return fallback;
}

export const findTotal = (summary, key) => summary?.totals?.find((total) => total.key === key) || null;
