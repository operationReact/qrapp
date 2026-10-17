const AUTH_PATHS = ["/login", "/register", "/forget-password", "/change-password"];

// Accepts only same-origin app paths so the auth redirect cannot be used as an open redirect.
export function getSafeRedirect(from) {
  if (typeof from !== "string") return null;
  if (!from.startsWith("/") || from.startsWith("//") || from.includes("\\")) return null;
  const pathname = from.split(/[?#]/)[0];
  if (AUTH_PATHS.includes(pathname)) return null;
  return from;
}
