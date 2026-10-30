import fs from "node:fs";
import path from "node:path";

const plistPath = path.resolve("ios/App/App/Info.plist");

if (!fs.existsSync(plistPath)) {
  console.error(`[ios] Missing generated Info.plist at ${plistPath}. Run 'npx cap add ios' first.`);
  process.exit(1);
}

let plist = fs.readFileSync(plistPath, "utf8");

const entries = [
  [
    "NSLocationWhenInUseUsageDescription",
    "Bro & Bro uses your location only while you use the app to help show nearby food-court locations. You can also choose a location manually.",
  ],
  [
    "NSPhotoLibraryUsageDescription",
    "Bro & Bro lets you choose photos to submit to Hall of Happiness when you explicitly select an image for upload.",
  ],
];

for (const [key, value] of entries) {
  if (plist.includes(`<key>${key}</key>`)) continue;
  plist = plist.replace(
    "</dict>",
    `\t<key>${key}</key>\n\t<string>${value}</string>\n</dict>`,
  );
}

fs.writeFileSync(plistPath, plist);
console.log("[ios] Applied App Store privacy purpose strings to Info.plist");
