import axios from "axios";

function isPrivateOrLocalHostname(hostname) {
  if (!hostname) return false;
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0"
  )
    return true;
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true;
  return hostname.endsWith(".local");
}
const resolvedBase = (() => {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv && fromEnv.trim() !== "") return fromEnv.trim();

  try {
    const host = typeof window !== "undefined" ? window.location.hostname : "";
    const protocol = typeof window !== "undefined" ? window.location.protocol : "http:";
    if (isPrivateOrLocalHostname(host)) {
      return `${protocol}//${host}:8080`;
    }
  } catch (_) {
    // ignore
  }

  console.error(
    "[api] VITE_API_URL was not set at build time and the app is not running on localhost. " +
    "Falling back to https://api.broandbro.in",
  );
  return "https://api.broandbro.in";
})();

console.info(`[api] baseURL → ${resolvedBase}`);

export const baseURL = resolvedBase;

export const apiClient = axios.create({ baseURL: resolvedBase });
let activeAuthToken = null;

apiClient.interceptors.request.use(
  (config) => {
    try {
      const raw = localStorage.getItem("user");
      const creds = raw ? JSON.parse(raw) : null;
      const token = creds?.token || activeAuthToken;
      if (token) {
        config.headers = config.headers || {};
        config.headers["Authorization"] = `Bearer ${token}`;
      }
      const activeLocation = JSON.parse(localStorage.getItem("active-location") || "null");
      if (activeLocation?.id) {
        config.headers = config.headers || {};
        config.headers["X-Location-Id"] = String(activeLocation.id);
      }
    } catch (e) {
      // ignore malformed localStorage
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (resp) => resp,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      try {
        activeAuthToken = null;
        delete apiClient.defaults.headers.common["Authorization"];
        localStorage.removeItem("user");
        window.dispatchEvent(
          new CustomEvent("auth:logout", {
            detail: { reason: "unauthorized" },
          }),
        );
      } catch (e) {
        /* ignore */
      }
    }
    return Promise.reject(error);
  },
);

export const setUserAuth = (token) => {
  if (token) {
    activeAuthToken = token;
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    try {
      const raw = localStorage.getItem("user");
      const existing = raw ? JSON.parse(raw) : {};
      localStorage.setItem("user", JSON.stringify({ ...existing, token }));
    } catch (e) {
      console.debug("setUserAuth localStorage write failed", e);
    }
  } else {
    activeAuthToken = null;
    try {
      localStorage.removeItem("user");
    } catch (e) {
      console.debug("setUserAuth localStorage remove failed", e);
    }
    delete apiClient.defaults.headers.common["Authorization"];
  }
};

export default apiClient;
