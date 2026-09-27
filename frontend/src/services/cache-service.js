import { apiClient } from "./index";

export async function getAllCaches() {
  const res = await apiClient.get("/api/cache");
  return res.data;
}

export async function clearAllCaches() {
  const res = await apiClient.delete("/api/cache");
  return res.data;
}

export async function clearCacheByName(cacheName) {
  const res = await apiClient.delete(`/api/cache/${cacheName}`);
  return res.data;
}

export function clearBrowserCache() {
  try {
    const keysToKeep = ["user", "admin-notification-read"];
    const allKeys = Object.keys(localStorage);

    allKeys.forEach((key) => {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    });

    sessionStorage.clear();

    if ("caches" in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }

    return { success: true, message: "Browser cache cleared" };
  } catch (error) {
    console.error("Error clearing browser cache:", error);
    throw error;
  }
}

export async function clearAllApplicationCache() {
  try {
    const serverResult = await clearAllCaches();
    const browserResult = clearBrowserCache();

    return {
      server: serverResult,
      browser: browserResult,
      success: true,
      message: "All application caches cleared successfully",
    };
  } catch (error) {
    console.error("Error clearing application cache:", error);
    throw error;
  }
}
