import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateIosApiUrl, keepNativeInternalLinkInApp } from "./iosReadiness.js";
import { getNearbyPosition } from "./nearbyPosition.js";

test("iOS builds require an explicit remote HTTPS API origin", () => {
  for (const value of [
    undefined, "", "/api", "http://localhost:8080", "http://api.example.com",
    "https://localhost", "https://server.local", "https://user@api.example.com",
    "https://api.example.com/path", "https://api.example.com?key=value",
    "https://api.example.com/#fragment",
  ]) {
    assert.throws(() => validateIosApiUrl(value));
  }
  assert.doesNotThrow(() => validateIosApiUrl("https://dev-api.broandbro.in"));
  assert.doesNotThrow(() => validateIosApiUrl("https://api.broandbro.in"));
});

test("native internal new-tab links remain inside the app; external links remain external", () => {
  for (const [href, expected] of [
    ["capacitor://localhost/privacy-policy", "_self"],
    ["capacitor://localhost/terms-and-conditions", "_self"],
    ["https://example.com/privacy-policy", "_blank"],
    ["mailto:support@example.com", "_blank"],
    ["capacitor://other-host/privacy-policy", "_blank"],
  ]) {
    const anchor = { href, target: "_blank" };
    keepNativeInternalLinkInApp({ target: { closest: () => anchor } }, "capacitor://localhost/");
    assert.equal(anchor.target, expected);
  }
  assert.doesNotThrow(() => keepNativeInternalLinkInApp({ target: {} }, "null"));
});

test("iOS packages local assets with native HTTP and no remote navigation or cleartext exceptions", () => {
  const config = JSON.parse(readFileSync(new URL("../../capacitor.config.json", import.meta.url)));
  assert.equal(config.appId, "in.broandbro.app");
  assert.equal(config.webDir, "dist");
  assert.equal(config.plugins.CapacitorHttp.enabled, true);
  assert.equal(config.ios.contentInset, "automatic");
  assert.equal(config.server, undefined);
  const plist = readFileSync(new URL("../../ios/App/App/Info.plist", import.meta.url), "utf8");
  assert.doesNotMatch(plist, /NSAllowsArbitraryLoads/);
  for (const permission of ["NSCameraUsageDescription", "NSPhotoLibraryUsageDescription", "NSLocationWhenInUseUsageDescription"]) {
    assert.match(plist, new RegExp(`<key>${permission}</key>\\s*<string>[^<]+</string>`));
  }
});

test("Nearby uses the iOS bridge with the existing position options", async () => {
  const options = { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 };
  const position = { coords: { latitude: 17, longitude: 78 } };
  assert.equal(await getNearbyPosition(options, {
    native: true,
    nativeApi: { getCurrentPosition: async (actual) => {
      assert.equal(actual, options);
      return position;
    } },
    webApi: { getCurrentPosition: () => assert.fail("Must not use browser location on iOS") },
  }), position);
});

test("Nearby preserves browser location and propagates denials and missing APIs", async () => {
  const position = { coords: { latitude: 17, longitude: 78 } };
  const options = { timeout: 10000 };
  assert.equal(await getNearbyPosition(options, {
    native: false,
    webApi: { getCurrentPosition: (resolve, _reject, actual) => {
      assert.equal(actual, options);
      resolve(position);
    } },
  }), position);
  await assert.rejects(getNearbyPosition(options, { native: false, webApi: null }), /unavailable/);
  const denied = new Error("Permission denied");
  await assert.rejects(getNearbyPosition(options, {
    native: true,
    nativeApi: { getCurrentPosition: async () => { throw denied; } },
  }), denied);
  await assert.rejects(getNearbyPosition(options, {
    native: false,
    webApi: { getCurrentPosition: (_resolve, reject) => reject(denied) },
  }), denied);
});

test("the iOS app icon is an opaque 1024px PNG", () => {
  const png = readFileSync(new URL("../../ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png", import.meta.url));
  assert.equal(png.readUInt32BE(16), 1024);
  assert.equal(png.readUInt32BE(20), 1024);
  assert.equal(png[25], 2);
});

test("all iOS configurations require WebKit compatible with the existing Tailwind frontend", () => {
  const project = readFileSync(new URL("../../ios/App/App.xcodeproj/project.pbxproj", import.meta.url), "utf8");
  const targets = [...project.matchAll(/IPHONEOS_DEPLOYMENT_TARGET = ([\d.]+);/g)];
  assert.equal(targets.length, 4);
  assert.ok(targets.every((target) => target[1] === "16.4"));
});
