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

Because the app offers Google Sign-In, Apple requires an equivalent login.
**Frontend and backend are both implemented** — only Apple Developer config + a
runtime property are needed to turn it on.

Implemented:
- Frontend button (`AppleCustomerSignIn.jsx`), wired into login.
- `POST /auth/apple/challenge` → `{ enabled, clientId, redirectUri?, nonce, state, scope }`.
- `POST /auth/apple/exchange` with `{ code, idToken, nonce, state, user }` →
  `{ status: "signed_in", session }` or `{ status: "mobile_verification_required", ticket, name }`
  (`AppleCustomerAuthService`, mirrors `GoogleCustomerAuthService`).
  - Verifies the `id_token` against Apple's JWKS (`appleid.apple.com/auth/keys`),
    checks `iss`, `aud` (against the configured client ids), `nonce` (raw **or**
    SHA-256, so web-JS and native flows both work), and expiry.
- The Apple link ticket flows through the existing WhatsApp-OTP linking path —
  the controller routes a ticket to whichever provider (Google/Apple) issued it,
  so no frontend field rename was needed.
- DB: migration `V168__customer_apple_identity.sql` adds `users.apple_subject`.

**Config wiring (done):** `application.yml` maps the service properties to SSM
(env var takes precedence, then Parameter Store, then empty/off):

```
app.apple.client-ids   = ${APP_APPLE_CLIENT_IDS   : app.parameter-store.apple.clientIds}
app.apple.redirect-uri = ${APP_APPLE_REDIRECT_URI : app.parameter-store.apple.redirectUri}
```

SSM paths (imported under the `app.parameter-store.` prefix, region = backend's `AWS_REGION`):

| SSM parameter | Property | Value |
|---|---|---|
| `/broandbro/backend/<env>/apple/clientIds` | `app.apple.client-ids` | Comma-separated: **Services ID** (web/JS, e.g. `in.broandbro.signin`) + iOS **bundle id** (`in.broandbro.app`) |
| `/broandbro/backend/<env>/apple/redirectUri` | `app.apple.redirect-uri` | Apple return URL, e.g. `https://www.broandbro.in/login` |

**Seed the parameters** with the helper (idempotent; seeds a non-activating
`REPLACE_ME` placeholder, so the feature stays **off** until you set real
values — run where your real AWS creds are):

```bash
./scripts/create-apple-ssm-parameters.sh dev      # and: prod
```

**Placeholder-safe:** the backend only enables Apple sign-in when `clientIds`
contains a real reverse-DNS id (a dot), mirroring Google's
`.apps.googleusercontent.com` gate. So a dummy value never shows a broken button
in production. To go live, overwrite with the real values and restart the
backend (it re-reads Parameter Store on startup).

Apple Developer portal: create an **App ID** with *Sign In with Apple*
capability, a **Services ID** for the web/JS flow, a **Key** for Sign in with
Apple, and configure return URLs. In Xcode add the *Sign in with Apple*
capability to the app target.

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
