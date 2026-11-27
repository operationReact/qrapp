# iOS / App Store Setup (BRO & BRO)

This document covers the work needed to ship the existing web app to the Apple
App Store. The Android app is a **TWA** (`android/`, `bro-and-bro-twa`) which has
no iOS equivalent — a bare WebView wrapper of `broandbro.in` would be rejected
under **Guideline 4.2 (Minimum Functionality)**. The approach here wraps the
**bundled** web build (not a live URL) with Capacitor and adds native
capabilities so the app clears review.

The code-side scaffolding is already in the repo. The steps below are the parts
that require macOS/Xcode, an Apple Developer account, and backend endpoints —
they cannot be run in CI/Linux.

---

## What is already in the repo

| Piece | Location |
|---|---|
| Capacitor config (bundles `dist/`, App Store-safe) | `frontend/capacitor.config.json` |
| Native bootstrap (status bar, hardware back → router, deep links, push) | `frontend/src/native/capacitor.js`, wired in `src/main.jsx` |
| Capacitor deps (`@capacitor/core`, `ios`, `cli`, `app`, `status-bar`, `push-notifications`, `share`, `browser`, `haptics`) | `frontend/package.json` |
| Sign in with Apple button + service calls (Guideline 4.8) | `frontend/src/components/AppleCustomerSignIn.jsx`, `src/services/auth-service.js`, wired into `src/routes/(auth)/login.jsx` |

`frontend/src/native/capacitor.js` is a **no-op on web and in the Android TWA**
(`Capacitor.isNativePlatform()` is false), so none of this changes existing web
or Android behaviour.

---

## 1. Generate the iOS project (macOS + Xcode required)

```bash
cd frontend
npm install
npm run build          # produces dist/ that Capacitor bundles
npx cap add ios        # creates frontend/ios/ (commit it)
npx cap sync ios
npx cap open ios       # opens Xcode
```

Re-run `npm run build && npx cap sync ios` after every web change. In Xcode set
the Team/signing, bundle id `in.broandbro.app`, and a version/build number.

## 2. Guideline 4.8 — Sign in with Apple (hard blocker)

Because the app offers Google Sign-In, Apple requires an equivalent login. The
frontend button is in place; the **backend must implement** (mirroring the
existing Google challenge/exchange contract):

- `POST /auth/apple/challenge` → `{ enabled, clientId, redirectUri, nonce, state, scope }`
  - `clientId` = the **Services ID** (e.g. `in.broandbro.signin`), *not* the app bundle id.
- `POST /auth/apple/exchange` with `{ code, idToken, nonce, state, user }` →
  the **same result shape** as Google exchange:
  `{ status: "signed_in", session }` or `{ status: "mobile_verification_required", ticket, name }`.
  - Verify the `id_token` signature against Apple's public keys, check `aud`,
    `iss` (`https://appleid.apple.com`), `nonce`, and expiry.
  - `user` (name/email) is sent by Apple **only on first authorization** — persist it then.

Apple Developer portal: create an **App ID** with *Sign In with Apple*
capability, a **Services ID** for the web/JS flow, a **Key** for Sign in with
Apple, and configure return URLs. In Xcode add the *Sign in with Apple*
capability to the app target.

> The frontend reuses the existing WhatsApp-link ticket flow, so the backend
> `ticket` returned for Apple should be accepted by `verifyLoginOTP` the same way
> `googleLinkTicket` is (consider renaming to a generic `socialLinkTicket`).

## 3. Guideline 4.2 — clear "minimum functionality"

The bundled build + native plugins already added provide status bar theming,
hardware/edge-back wired to the router, deep-link routing, and a push hook. Make
at least push notifications live (order status updates are a natural fit) and
wire `registerPushNotifications()` after login. Add native share where the app
currently shares links.

## 4. Payments

Food delivery is a physical good/service, so **IAP is not required** — the
existing Razorpay web checkout is allowed. `capacitor.config.json` already
allow-lists `*.razorpay.com`, `accounts.google.com`, and `appleid.apple.com` for
in-app navigation (and `limitsNavigationsToAppBoundDomains` is `false` so those
auth/payment popups work).

## 5. App Privacy & required URLs

- App Privacy "nutrition label" in App Store Connect must match what the app
  collects (phone, name, location, payment via Razorpay).
- Reuse existing in-app pages: Privacy Policy (`/privacy-policy`), Terms
  (`/terms-and-conditions`), and **in-app account deletion** (`/profile` →
  Delete account), which satisfies Guideline 5.1.1(v).

## 6. Safe areas / notch

`viewport-fit=cover` is set and the app uses `env(safe-area-inset-*)` via
`--app-safe-bottom` and in headers. With `contentInset: "always"` verify the top
header and the bottom nav clear the notch and home indicator on a notched device
in Xcode's simulator.

---

## Submission checklist

- [ ] `npx cap add ios` project generated and committed
- [ ] Backend `/auth/apple/*` endpoints implemented and verified
- [ ] Sign in with Apple capability + Services ID + Key configured
- [ ] Push notifications working (APNs key uploaded to App Store Connect)
- [ ] App Privacy details completed
- [ ] Tested on a notched device simulator (safe areas, deep links, back gesture)
- [ ] Screenshots + description prepared
