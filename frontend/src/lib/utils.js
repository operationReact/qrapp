import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString) {
  return new Date(dateString).toLocaleString("en-IN", {
    dateStyle: "long",
    timeStyle: "medium",
  });
}

/**
 * Determines whether an order should be displayed as "Paid" in the admin UI.
 *
 * Rules:
 *  • paymentStatus === "PAID"           → always Paid (confirmed by gateway/wallet)
 *  • paymentMethod === "PAY_AT_STALL"   → Unpaid (customer pays at the counter)
 *  • paymentMethod === "RAZORPAY"
 *    or "WALLET"                        → Paid (pre-paid online, even before webhook)
 *  • anything else                      → Unpaid (legacy / unknown)
 */
/** Convert raw minutes → "15m" / "2h" / "1d 3h" */
export function formatAge(minutes) {
  const m = minutes ?? 0;
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h`;
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

export function isOrderPaid(order) {
  if (String(order?.paymentStatus ?? "").toUpperCase() === "PAID") return true;
  const method = String(order?.paymentMethod ?? "").toUpperCase();
  if (method === "PAY_AT_STALL") return false;
  if (method === "RAZORPAY" || method === "WALLET") return true;
  return false;
}

