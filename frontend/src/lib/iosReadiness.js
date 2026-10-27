export function validateIosApiUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("iOS builds require an explicit HTTPS VITE_API_URL.");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.hostname === "localhost" ||
    url.hostname.endsWith(".local")
  ) {
    throw new Error("iOS VITE_API_URL must be a remote HTTPS API origin without credentials.");
  }
}

export function keepNativeInternalLinkInApp(event, appUrl) {
  const anchor = event.target?.closest?.("a[target='_blank']");
  if (!anchor) return;
  const target = new URL(anchor.href);
  const current = new URL(appUrl);
  if (target.protocol === current.protocol && target.host === current.host) {
    // WKWebView cannot open capacitor:// URLs in the system browser.
    anchor.target = "_self";
  }
}
