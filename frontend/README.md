# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## iOS / TestFlight readiness (27 October 2026)

**Status: packaging source is prepared, not yet TestFlight/App Store ready.**
This checkout was verified on Linux without macOS/Xcode; no iOS binary, simulator
run, signing, archive, upload or Apple approval has been performed.

### Scope and packaging decision

- Starting point: `dev` `90a4462`, on feature branch
  `copilot/ios-app-store-readiness-audit`; PR #231 targets `dev`.
  Compared with `main` `198ee6f`: frontend/backend source are identical.
  Differences are Android minSdk, a production workflow and gradlew file mode;
  none were merged or modified.
- Capacitor 8 bundles the existing Vite `dist` in WKWebView with Swift Package
  Manager dependencies in `ios/App/App.xcodeproj`. No frontend rewrite, remote
  `server.url`, broad navigation allowlist, backend/CORS change, Android conversion,
  production setting change or deployment is needed.
- Proposed bundle ID: `in.broandbro.app` (confirm ownership/availability in the
  Apple Developer account). Initial marketing version `1.0`, build `1`; increment
  the build for every upload, independently of Android.
- `ios:sync` builds in **ios mode**, defaulting to the development API from
  `.env.ios`. It requires an explicit HTTPS API origin to prevent the existing
  localhost API fallback from targeting the phone itself. For a release, explicitly
  override `VITE_API_URL` as shown below. Never put secrets in `VITE_*` variables.
- CapacitorHttp patches fetch/XHR on native only, including Axios and FormData,
  using native networking rather than relaxing the backend's browser CORS list.
  Authentication headers and `X-Location-Id` remain unchanged. No ATS cleartext
  exceptions are enabled. Verify authenticated requests, multipart uploads and
  payment-provider requests on a real device.
- Browser/Android TWA retain their existing API selection and service worker.
  Native uses bundled assets instead of service workers. Only iOS Nearby uses
  the native geolocation plugin; browser/Android keep navigator.geolocation.
- The Capacitor CLI is pinned at 8.4.3 to avoid the vulnerable xcode/uuid dependency
  in 8.5.3; runtime/iOS are pinned at 8.5.3. Reassess advisories before upgrades.

### Focused flow and App Review audit

| Area | Source finding / remaining release gate |
| --- | --- |
| Login / OTP | Existing phone/password login, WhatsApp OTP registration/reset and password-change routes are reused. Test OTP delivery, expiry/resend, password autofill, logout/401, session persistence and deletion after relaunch. No social login is present, so login alone does not require adding Sign in with Apple. |
| Navigation / links | TanStack routes and local reloads remain in the bundled app. Native internal `target="_blank"` policy/terms links are kept in-app; external HTTPS, tel and mail links use Capacitor's system handling. Test campaigns/support links and return-to-app. |
| Deep links | Android verified app links are unchanged. iOS Universal Links/custom payment-return schemes are **not configured or claimed**. Ordinary website/QR links open the website. If app-opening links are required, owner must supply the Team ID, associated-domain entitlement and hosted AASA file, then add a validated route handler. Validate payment methods that leave the app before release; do not assume a bank/UPI return works. |
| Payments | Cart, preorder and wallet top-up use Razorpay's web checkout plus existing server verification; wallet and Pay at Stall are location-configured. Physical food/services do not use Apple IAP (guideline 3.1.3(e)); confirm wallet credits remain limited to these purchases. Real-device sandbox success/failure/cancel, 3DS/bank/UPI hand-off, return, duplicate-tap and delayed verification tests are blockers. If the web checkout cannot complete a required method in WKWebView, use Razorpay's supported native Capacitor integration in a follow-up; no unverified SDK rewrite is included here. |
| Uploads / permissions | Hall of Happiness uses an image file input and multipart uploads, up to 5 MB per file. Camera/photo usage descriptions are included for the picker. Test camera and limited-library access, denied access, multiple files, HEIC rejection/conversion behavior, progress, upload errors and withdrawal. No microphone, background location or full-library plugin is added. |
| Nearby | Native location is requested only after tapping Nearby; denial/unavailability falls back to browsing all locations. The plugin also requires the Always-and-When-In-Use description, but the app does not request background location or enable background modes. Verify Allow Once, approximate location and denial. |
| Safe areas / keyboard | Viewport already has `viewport-fit=cover`; existing cart/menu/auth screens use safe-area CSS. Native automatic content insets/mobile rendering are enabled. Check notch/home indicator, fixed cart/footer, portrait/landscape, iPad and keyboard focus/scroll on login/OTP/checkout. No untested keyboard workaround is added. |
| Offline / errors | Local shell boots without downloading the website. API operations still require a network; existing location retry/error UI and React Query reconnect handling remain. There is no offline ordering or offline payment guarantee. Test airplane-mode cold launch, API outage, reconnect and interrupted payment; never treat a network error as payment success. |
| WKWebView APIs | fetch/XHR, localStorage and file input have native/WebKit paths; do not share Safari's login storage. Service worker is skipped natively. Blob/anchor invoice downloads and clipboard actions still need device verification; PDF save/share may require a native plugin if WebKit cannot handle the existing download path. |
| Minimum functionality | Bundled interactive location/menu/cart/ordering/order-status/wallet flows are more than a static landing page, but guideline 4.2 approval is not guaranteed. Provide a usable service location and review instructions; assess the actual device experience before submission. |
| Deletion | Existing Profile → Delete account calls `DELETE /auth/me` with password reauthentication and anonymization; public `/account-deletion` explains it. Active orders, wallet balance and staff roles block deletion. Verify a customer can actually resolve these conditions and complete deletion; retained transaction records and retention/legal reasons must match the policy. A public support-only request is not a substitute for in-app deletion. |
| Privacy / support | Existing `/privacy-policy`, `/contact-us`, `/help-support` and footer links are reused; companyInfo lists admin@broandbro.in. Owner must verify the live URLs/contact work without login and enter public HTTPS privacy/support URLs in App Store Connect, not capacitor:// URLs or API endpoints. |
| User photos | Hall of Happiness is moderated user content. Confirm reporting/removal, objectionable-content handling and any required user blocking meet guideline 1.2 before review; moderation alone is not assumed sufficient. |

### Exact Mac / Apple account hand-off

1. Use a Mac supported by **Xcode 26+ with the iOS 26 SDK** (and a macOS
   version supported by that Xcode), Node **22+**, and an Apple Developer membership.
   The app deployment target is **iOS 16.4** to match the existing Tailwind 4
   frontend's WebKit baseline (higher than Capacitor's iOS 15 minimum). The iOS
   Vite build explicitly targets Safari 16.4; the managed SPM wrapper records only
   the major iOS version, while the app target enforces 16.4.
   Install Xcode, accept its license,
   select its developer directory, and install an iOS simulator runtime:

   ```sh
   sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
   sudo xcodebuild -license accept
   xcodebuild -version
   xcrun --sdk iphoneos --show-sdk-version
   ```

2. Check out the PR branch and use the absolute path to your Mac checkout:

   ```sh
   cd /path/to/qrapp/frontend
   npm ci
   npm run test:ios
   npm run ios:sync
   npm run ios:open
   ```

   Sync regenerates ignored native web assets/config and the managed
   `ios/App/CapApp-SPM/Package.swift`. Do not hand-edit that package file.
   SPM resolves native dependencies in Xcode; CocoaPods is not required.
   Resolve packages and build the simulator (no signing):

   ```sh
   xcodebuild -resolvePackageDependencies -project ios/App/App.xcodeproj -scheme App
   xcodebuild -project ios/App/App.xcodeproj -scheme App \
     -configuration Debug -sdk iphonesimulator \
     -destination 'generic/platform=iOS Simulator' \
     -derivedDataPath /tmp/brobro-ios-derived CODE_SIGNING_ALLOWED=NO build
   ```

   Launch scheme **App** on an installed simulator and then a physical iPhone.
   The recent dev deployment failed because no running dev EC2 instance was found
   (Actions run 40314669494); confirm dev API availability with the owner before
   end-to-end testing. This PR does not provision or deploy that environment.

3. Before a release archive, choose the intended API **explicitly** and sync:

   ```sh
   VITE_API_URL=https://api.broandbro.in npm run ios:sync
   ```

   This only selects the client endpoint; it does not deploy/change the backend.
   Use a staging API and sandbox credentials for payment testing, not live charges.
   Confirm the copied native config/assets are from the intended build.

4. In Xcode → App target → Signing & Capabilities, select your Team, register or
   confirm `in.broandbro.app`, enable automatic signing and provision a test device.
   Set Version and an unused Build number in **both Debug/Release** as appropriate.
   Icons are opaque 1024px artwork and launch images generated from the existing
   `public/bro-logo.png`; owner should approve their quality on-device. Review all
   purpose strings. No signing team, certificate, profile or credentials are stored
   in this repository. Do not commit generated assets/config, DerivedData, archives,
   provisioning profiles or private keys.

5. Complete every device gate above. Inspect the archive's merged privacy report
   and native SDK manifests/required-reason APIs. `ITSAppUsesNonExemptEncryption`
   is false for the current standard HTTPS-only use; owner must confirm export
   compliance against all SDKs before relying on this answer.
   Product → **Archive** with Any iOS Device (Release), then Organizer → **Validate
   App**. These steps have **not** been run here.

6. Owner-only, after validation: create/confirm the App Store Connect app record
   using the matching bundle ID, upload a signed archive to TestFlight and resolve
   processing/export-compliance warnings. Upload screenshots for supported device
   families, app metadata, age/content rating and public privacy/support URLs.
   Inventory actual data flows for App Privacy (contact/profile details, account
   identifiers, purchases/payment records, uploaded photos and support content;
   verify SDK diagnostics/sharing/retention). Nearby coordinates are used locally
   for sorting; do not automatically label them off-device collection without
   verifying the release/SDK behavior. A privacy manifest does not replace these
   disclosures, and ATT is not added absent tracking.

7. Supply a working, non-admin reviewer phone/password account and accessible
   location/menu with instructions for OTP, ordering, payment test mode, deletion
   and any location/time restrictions. Put credentials only in App Store Connect
   Review Information, **never in Git**. Confirm backend/review availability and a
   monitored support contact. Owner decides when to invite TestFlight testers and
   submit for review; this PR does neither.

References: [Capacitor iOS](https://capacitorjs.com/docs/ios),
[Capacitor 8 requirements](https://capacitorjs.com/docs/updating/8-0),
[Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/),
[submission requirements](https://developer.apple.com/news/upcoming-requirements/),
[App Privacy](https://developer.apple.com/app-store/app-privacy-details/).

### Verification evidence from this PR

- `npm ci`: passed on Node 22/Linux.
- `node --test src/lib/*.test.js src/components/home/campaignPresentation.test.js`:
  **82 passed**, including 7 iOS readiness tests.
- Targeted ESLint on the new helpers/tests, native bootstrap, location component
  and ESLint config: passed. Repository-wide `npm run lint` completes with
  **38 existing issues (35 errors, 3 warnings)**, including the existing
  `__dirname` lint error in Vite config; it is not claimed green.
- `npm run build:prod`: passed (existing large-chunk warnings).
- `npm run ios:sync`: passed, including the Safari 16.4-targeted web build and
  native asset/plugin sync. An HTTP/localhost API override is rejected before
  bundling. Native plist/storyboard syntax and asset-file references validate.
- Browser smoke check of the built landing, login, account-deletion and privacy
  pages: rendered successfully; not an authenticated or WKWebView device test.
- `npm audit`: **23 advisories (5 moderate, 16 high, 2 critical)**, identical to
  the unmodified lockfile baseline; no new advisory package was introduced.
  Existing dependency remediation remains separate release work.
- Secret scan: passed. CodeQL JavaScript: no alerts. Swift CodeQL could not create
  a database on this runner; native analysis is not claimed to have passed.
- **Not run:** Xcode/SPM resolution, simulator/device build, signed archive,
  Organizer validation, native payment/upload/keyboard/offline end-to-end tests,
  TestFlight upload or App Store submission. These remain release gates.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
