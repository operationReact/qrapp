import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const notes = [];

function fail(message) {
  failures.push(message);
}

function pass(message) {
  notes.push(`PASS: ${message}`);
}

function readJson(relativePath) {
  const fullPath = path.resolve(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    fail(`Missing ${relativePath}`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    fail(`Invalid JSON in ${relativePath}: ${error.message}`);
    return null;
  }
}

function requireFile(relativePath) {
  const fullPath = path.resolve(root, relativePath);
  if (!fs.existsSync(fullPath)) {
    fail(`Missing required file: ${relativePath}`);
    return false;
  }
  pass(relativePath);
  return true;
}

function findFiles(startPath, fileName, matches = []) {
  if (!fs.existsSync(startPath)) return matches;
  for (const entry of fs.readdirSync(startPath, { withFileTypes: true })) {
    const fullPath = path.join(startPath, entry.name);
    if (entry.isDirectory()) findFiles(fullPath, fileName, matches);
    else if (entry.isFile() && entry.name === fileName) matches.push(fullPath);
  }
  return matches;
}

const capacitor = readJson("capacitor.config.json");
if (capacitor) {
  if (capacitor.appId !== "in.broandbro.app") fail(`Unexpected Capacitor appId: ${capacitor.appId}`);
  else pass("Capacitor bundle identifier is in.broandbro.app");

  if (capacitor.webDir !== "dist") fail(`Unexpected Capacitor webDir: ${capacitor.webDir}`);
  else pass("Capacitor webDir is dist");

  if (!capacitor.appName || !capacitor.appName.toLowerCase().includes("bro")) fail("Capacitor appName is missing or unexpected");
  else pass(`Capacitor appName is ${capacitor.appName}`);
}

const pkg = readJson("package.json");
if (pkg) {
  const expected = "8.6.0";
  for (const [section, dep] of [
    ["dependencies", "@capacitor/core"],
    ["dependencies", "@capacitor/ios"],
    ["devDependencies", "@capacitor/cli"],
  ]) {
    const actual = pkg[section]?.[dep];
    if (actual !== expected) fail(`${dep} must be pinned to ${expected}; found ${actual ?? "missing"}`);
    else pass(`${dep} ${expected}`);
  }
}

for (const asset of [
  "public/apple-touch-icon.png",
  "public/pwa-192.png",
  "public/pwa-512.png",
  "public/pwa-maskable-512.png",
  "public/bro-logo.png",
  "public/manifest.webmanifest",
]) {
  requireFile(asset);
}

const manifest = readJson("public/manifest.webmanifest");
if (manifest) {
  if (manifest.display !== "standalone") fail(`PWA display should be standalone; found ${manifest.display}`);
  else pass("PWA manifest uses standalone display mode");
}

const configureScriptPath = path.resolve(root, "scripts/configure-ios.mjs");
if (requireFile("scripts/configure-ios.mjs")) {
  const configureScript = fs.readFileSync(configureScriptPath, "utf8");
  for (const key of ["NSLocationWhenInUseUsageDescription", "NSPhotoLibraryUsageDescription"]) {
    if (!configureScript.includes(key)) fail(`configure-ios.mjs does not configure ${key}`);
    else pass(`configure-ios.mjs configures ${key}`);
  }
}

const capacitorIosRoot = path.resolve(root, "node_modules/@capacitor/ios");
const privacyManifests = findFiles(capacitorIosRoot, "PrivacyInfo.xcprivacy");
if (privacyManifests.length === 0) {
  fail("@capacitor/ios PrivacyInfo.xcprivacy was not found after dependency installation");
} else {
  pass(`Capacitor privacy manifest found (${path.relative(root, privacyManifests[0])})`);
}

const indexPath = path.resolve(root, "index.html");
if (requireFile("index.html")) {
  const index = fs.readFileSync(indexPath, "utf8");
  if (!index.includes("viewport-fit=cover")) fail("index.html is missing viewport-fit=cover");
  else pass("viewport-fit=cover is configured");
  if (!index.includes("apple-mobile-web-app-capable")) fail("index.html is missing Apple mobile web app metadata");
  else pass("Apple mobile web app metadata is present");
}

for (const line of notes) console.log(`[ios-preflight] ${line}`);

if (failures.length > 0) {
  console.error("\n[ios-preflight] FAILED");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\n[ios-preflight] All repository-level iOS release checks passed.");
console.log("[ios-preflight] Signing, provisioning, App Store Connect metadata, Universal Links Team ID, and real-device QA remain external release gates.");
