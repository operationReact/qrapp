# Bro & Bro — iOS App Store Setup

The React/Vite frontend is packaged for iOS with Capacitor. The Android TWA remains unchanged.

## What is configured

- App ID / bundle identifier: `in.broandbro.app`
- App name: `BroBro Food Delivery`
- Web build directory: `frontend/dist`
- Capacitor iOS runtime: `@capacitor/core`, `@capacitor/ios`, and `@capacitor/cli` 8.6.0
- iOS simulator build validation in GitHub Actions
- Existing web UI already uses `viewport-fit=cover` and safe-area insets in the primary mobile shells
- 44pt minimum iOS touch targets for native-shell controls
- shared Android/iOS keyboard viewport handling using `visualViewport`
- focused form controls are kept visible above the software keyboard
- bottom navigation and sticky cart UI move out of the way while typing
- mobile inputs use 16px-or-larger text to avoid iOS focus zoom
- phone and OTP inputs request the appropriate native keyboards and autofill hints

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

Before uploading an archive to App Store Connect, verify on a real iPhone and a representative Android device:

- sign in / sign out
- registration and OTP autofill
- phone, numeric, password, and text keyboard layouts
- focused fields remain visible when the keyboard opens
- keyboard dismissal restores bottom navigation and sticky cart actions
- long forms and dialogs remain scrollable with the keyboard open
- orientation changes while editing a field
- location selection and permission behavior
- cart, checkout, payment handoff and return flow
- orders and order tracking
- profile and account deletion
- external links and downloads
- Hall of Happiness upload/report flow
- camera/photo access if later enabled
- push notifications if later enabled
- Dynamic Island/notch and home-indicator safe areas
- dark/light system settings where applicable
- offline/error states

## App Review preparation

Before submission:

- provide a stable App Review test account and any instructions needed to reach ordering, wallet, checkout, order history, and customer-memory features
- make sure App Store Connect privacy disclosures match the data actually collected by the app and backend
- provide a public privacy-policy URL
- verify in-app account deletion end to end
- verify the Report Content path for customer Hall of Happiness memories reaches support/moderation
- explain in Review Notes that Razorpay/wallet/Pay at Stall are used only for physical food/services, not digital content
- complete real-device accessibility, keyboard, safe-area, and external-navigation QA

The GitHub `iOS Readiness` workflow performs an unsigned iOS Simulator build and validates the generated privacy-purpose keys. It intentionally does not perform App Store signing because signing requires Apple Developer credentials and provisioning.
