const SAFE_SEGMENT = /^[A-Za-z0-9._~-]+$/;

/**
 * Returns an in-app /partner path that is safe to navigate to, or null. Backend-generated targetPath values are
 * still treated as untrusted: external URLs, protocol-relative URLs, traversal and query/fragment tricks are ignored.
 */
export function safePartnerPath(targetPath) {
  if (typeof targetPath !== "string") return null;
  const path = targetPath.trim();
  if (!path.startsWith("/partner")) return null;
  const segments = path.slice(1).replace(/\/+$/, "").split("/");
  if (segments[0] !== "partner") return null;
  if (segments.some((segment) => !SAFE_SEGMENT.test(segment) || segment === "." || segment === "..")) return null;
  return `/${segments.join("/")}`;
}

export function unreadLabel(count) {
  const value = Number(count) || 0;
  if (value <= 0) return "";
  return value > 99 ? "99+" : String(value);
}

export const NOTIFICATION_PAGE_SIZE = 20;

export function notificationErrorMessage(error) {
  if (error?.response?.status === 403) return "You do not have permission to view notifications.";
  if (!error?.response) return "Unable to reach the server. Check your connection and try again.";
  return "Notifications are temporarily unavailable. Please try again.";
}
