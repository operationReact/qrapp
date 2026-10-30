# Bro & Bro — iOS App Store Setup

The React/Vite frontend is packaged for iOS with Capacitor. The Android TWA remains unchanged.

## What is configured

- App ID / bundle identifier: `in.broandbro.app`
- App name: `BroBro Food Delivery`
- Web build directory: `frontend/dist`
- Capacitor iOS runtime: `@capacitor/core`, `@capacitor/ios`, and `@capacitor/cli` 8.6.0
- iOS simulator build validation in GitHub Actions
- Existing web UI uses `viewport-fit=cover` and safe-area insets in the primary mobile shells
- Native-iOS presentation class (`capacitor-ios`) for targeted App Store UI hardening
- 44pt minimum interactive hit areas on iOS touch surfaces without changing business behavior
- 44pt minimum form controls on iOS, with 16px minimum editable text to avoid accidental Safari/WKWebView zoom
- reduced-motion support for iOS accessibility settings
- service-worker registration disabled inside the Capacitor native shell
- same-origin `_blank` legal/help links stay inside the app shell instead of opening a second web surface
- generated iOS `Info.plist` receives location and photo-library purpose strings during setup/CI
- Hall of Happiness customer memories expose a visible `Report content` route to support/contact

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

`ios:add` now generates the Capacitor project and applies the required privacy-purpose strings automatically.

After the iOS project has been created once, use:

```bash
npm run ios:sync
npm run ios:open
```

`ios:sync` rebuilds the production web bundle, syncs Capacitor, and reapplies the iOS privacy configuration.

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

## App Review account

Before submission, create and keep a stable reviewer account that does not expire during review.

In App Store Connect review notes provide:

- reviewer username/phone and password
- the customer company/location the account belongs to
- any OTP bypass or pre-verified setup needed for the reviewer account
- exact steps to reach cart, checkout, orders, wallet, profile/account deletion, party orders, and Hall of Happiness
- a note that food orders are physical goods/services and are paid using Razorpay, wallet, or Pay at Stall where enabled
- any test card/payment instructions required by the production review environment

Do not require the reviewer to contact an employee to complete first login.

## Privacy / App Privacy checklist

Before submission, confirm App Store Connect disclosures match the production app and backend exactly, including any of the following that are actually collected:

- account identifiers and phone number
- name / profile information
- date of birth or special dates if provided
- approximate/precise location when the user invokes nearby-location discovery
- purchase/order history
- payment-related metadata (do not claim card numbers are collected if Razorpay handles them directly)
- user-uploaded Hall of Happiness photos/captions
- diagnostics/analytics, if enabled in production

The in-app Privacy Policy and App Store Connect privacy URL must point to the current production policy.

## User-generated content safeguards

Hall of Happiness is curated: customer uploads are reviewed before publication and are not automatically public. Published customer memories now include a `Report content` path to Bro & Bro support.

Before App Store submission verify operationally that:

- submitted content can be rejected/removed by moderators
- reported content is reviewed promptly
- support/contact information is current
- abusive or unlawful content can be removed from publication

If the product later introduces direct user-to-user interaction, comments, messaging, or public profiles, add user blocking and stronger in-app reporting before shipping that feature.

## App Store readiness checks

Before uploading an archive to App Store Connect, verify on a real iPhone:

- app launches with no browser/address bar
- sign in / sign out
- reviewer/demo account works without staff intervention
- location selection works with permission allowed, denied, and manual-selection fallback
- cart, checkout, Razorpay handoff and return flow
- wallet payment and Pay at Stall where enabled
- orders and order tracking
- profile and in-app account deletion
- Terms, Privacy, support, maps and other links open intentionally
- Hall of Happiness upload, consent, moderation and report-content path
- photo-library permission copy is shown only when needed
- Dynamic Island/notch and home-indicator safe areas
- 44pt interaction targets on bottom navigation, dialogs and forms
- VoiceOver labels/focus order for core ordering flows
- Dynamic Type / text scaling does not hide critical controls
- Reduce Motion setting does not break navigation or ordering
- dark/light system settings where applicable
- offline/error states
- app recovery after backgrounding and returning from payment/permission flows

## Submission boundary

The GitHub `iOS Readiness` workflow performs an unsigned iOS Simulator build and verifies required privacy-purpose strings. It intentionally does not perform App Store signing because signing requires Apple Developer credentials and provisioning.

A successful simulator CI build is necessary but not sufficient for App Store submission. The final signed Release archive must still be tested on at least one real iPhone before uploading to App Store Connect.
