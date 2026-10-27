import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

export function getNearbyPosition(options, {
  native = Capacitor.getPlatform() === "ios",
  nativeApi = Geolocation,
  webApi = globalThis.navigator?.geolocation,
} = {}) {
  if (native) return nativeApi.getCurrentPosition(options);
  return new Promise((resolve, reject) => {
    if (!webApi) {
      reject(new Error("Location is unavailable"));
      return;
    }
    webApi.getCurrentPosition(resolve, reject, options);
  });
}
