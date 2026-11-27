import { Capacitor } from "@capacitor/core";

/**
 * Native (Capacitor) bootstrap.
 *
 * A no-op in the browser and in the Android TWA — `isNativePlatform()` is false
 * there, so none of the native plugins are ever imported into the web bundle
 * (the dynamic imports below only run inside the Capacitor iOS/Android shell).
 *
 * This is what lifts the iOS build above a bare WebView wrapper (App Store
 * Guideline 4.2): native status-bar theming, hardware/edge back handling wired
 * to the SPA router, deep-link routing, and a push-notification registration
 * hook.
 *
 * @param {import('@tanstack/react-router').Router} router
 */
export async function initNativeShell(router) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Light });
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#ef4444" });
    }
  } catch (error) {
    console.warn("[native] status bar setup skipped", error);
  }

  try {
    const { App } = await import("@capacitor/app");

    // Hardware / edge back gesture -> SPA history, exit only at the root.
    App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack && window.history.length > 1) {
        router.history.back();
      } else {
        App.exitApp();
      }
    });

    // Universal links / custom-scheme deep links -> internal route.
    App.addListener("appUrlOpen", ({ url }) => {
      try {
        const parsed = new URL(url);
        const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
        if (path && path !== "/") router.navigate({ to: path });
      } catch {
        /* ignore malformed deep links */
      }
    });
  } catch (error) {
    console.warn("[native] app listeners skipped", error);
  }
}

/**
 * Register for push notifications on the native platform. Call this after the
 * user is authenticated so the token can be associated with their account.
 * Safe no-op on web.
 *
 * @param {(token: string) => void} onToken
 */
export async function registerPushNotifications(onToken) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") return;
    await PushNotifications.register();
    PushNotifications.addListener("registration", (token) => {
      onToken?.(token.value);
    });
  } catch (error) {
    console.warn("[native] push registration skipped", error);
  }
}
