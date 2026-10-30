# Bro & Bro — iOS App Store Setup

The React/Vite frontend is packaged for iOS with Capacitor. The Android TWA remains unchanged.

## What is configured

- App ID / bundle identifier: `in.broandbro.app`
- App name: `BroBro Food Delivery`
- Web build directory: `frontend/dist`
- Capacitor iOS runtime: `@capacitor/core`, `@capacitor/ios`, and `@capacitor/cli` 8.6.0
- iOS simulator build validation in GitHub Actions
- Existing web UI already uses `viewport-fit=cover` and safe-area insets in the primary mobile shells

## First-time local setup on macOS

Requirements:

- Node.js 22+
- Xcode and Xcode Command Line Tools
- An Apple Developer account for device/App Store signing

From `frontend/`:

```bash
npm install
npm run ios:add
npm run ios:open
```

After the iOS project has been created once, use:

```bash
npm run ios:sync
npm run ios:open
```

## Signing boundary

Open the generated Xcode project and select the `App` target, then configure **Signing & Capabilities** with the Apple Developer team that owns the Bro & Bro App Store app.

The bundle identifier must stay:

```text
in.broandbro.app
```

Do not commit signing certificates, `.p12` files, provisioning profiles, Apple passwords, or App Store Connect API private keys.

## Universal Links

Universal Links require the Apple Team ID. Once the Team ID is known:

1. Add the Associated Domains capability in Xcode.
2. Add `applinks:broandbro.in` and `applinks:www.broandbro.in`.
3. Publish `/.well-known/apple-app-site-association` on the production domain using the app ID `<APPLE_TEAM_ID>.in.broandbro.app`.
4. Validate links on a real iPhone after installing the signed app.

Do not publish a placeholder Team ID.

## App Store readiness checks

Before uploading an archive to App Store Connect, verify on a real iPhone:

- sign in / sign out
- location selection and permission behavior
- cart, checkout, payment handoff and return flow
- orders and order tracking
- profile and account deletion
- external links and downloads
- camera/photo access if later enabled
- push notifications if later enabled
- Dynamic Island/notch and home-indicator safe areas
- dark/light system settings where applicable
- offline/error states

The GitHub `iOS Readiness` workflow performs an unsigned iOS Simulator build. It intentionally does not perform App Store signing because signing requires Apple Developer credentials and provisioning.
