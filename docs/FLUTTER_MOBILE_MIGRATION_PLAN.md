# Bro & Bro Flutter Mobile Migration Plan

## Baseline

- Source branch: `main`
- Feature branch: `feature/flutter-mobile-migration`
- Baseline commit: `198ee6f9a729daf24e0b707a9fdc2ea6b4dbd8aa`
- Existing customer web app: React 19 + Vite + TanStack Router/Query
- Existing Android packaging: Trusted Web Activity (TWA) using `com.google.androidbrowserhelper.trusted.LauncherActivity`
- Existing Android application ID / namespace: `in.broandbro.app`
- Backend: Spring Boot 3.4.4, Java 17, Gradle, PostgreSQL/Flyway, Spring Security, JPA, existing backend tests

## Objective

Build a real Flutter customer application for Android and iOS while preserving the existing Spring Boot backend, business rules, web/admin/partner applications, and production behavior. The Flutter mobile app must not be a browser/TWA shell and therefore must not show the `broandbro.in` browser/domain bar.

## Non-goals

- Do not rewrite the Spring Boot backend unless a mobile-specific API gap is proven.
- Do not replace the existing React web/admin/partner portals.
- Do not change production infrastructure during the migration.
- Do not publish to Play Store/App Store until regression, device, security, and release gates pass.

## Migration strategy

Use an incremental strangler-style migration. The current app remains the behavior reference while Flutter is built alongside it. Reuse the same backend contracts and preserve the Android package/application identity where release/signing constraints allow.

## Phase 0 — Baseline and safety gates

1. Record baseline branch/commit and existing release configuration.
2. Inventory customer-facing routes, API calls, auth/session behavior, location handling, cart/order/payment flows, account deletion, deep links, PWA/TWA behavior, notifications, and analytics.
3. Run all existing backend and frontend tests before Flutter implementation.
4. Capture API contracts used by the customer web app.
5. Define staging/test data and payment test-mode requirements.
6. Add CI gates so Flutter changes cannot silently break backend/frontend builds.

Exit criteria:
- Existing backend tests green.
- Existing frontend lint/build/tests green.
- No production deployment triggered by this branch.
- Customer-critical flow inventory completed.

## Phase 1 — Flutter foundation

Create a new `mobile/` Flutter application with:

- Android + iOS targets.
- Package/bundle identity aligned to `in.broandbro.app` after signing/release compatibility validation.
- Environment configuration for dev/staging/prod API URLs.
- Routing/navigation.
- API client with timeouts, error mapping, auth interceptors, idempotency support where required, and structured logging without secrets.
- Secure token/session storage.
- Design tokens/theme mapped from the existing Bro & Bro experience.
- Reusable loading, empty, error, offline, retry, and confirmation states.
- Crash/error reporting abstraction.

Testing:
- Dart unit tests for configuration and API/error handling.
- Widget tests for app shell/navigation/common states.
- Static analysis and formatting gates.

## Phase 2 — Authentication, profile, and location

Migrate:

- Login/authentication/session restore/logout.
- User/profile flows.
- Location discovery/selection and current location handling.
- Permission denial and retry behavior.
- Account deletion entry/flow.
- Deep-link routing required by customer flows.

Testing:
- Unit tests for auth/session/location state.
- Widget tests for success/error/expired-session/permission states.
- Integration tests against staging API.
- Android and iOS permission/device checks.

## Phase 3 — Discovery, home, menu, search, item details

Migrate:

- Customer home experience.
- Location-aware content.
- Categories/stalls/menu browsing.
- Search/filtering.
- Item details, availability, veg/non-veg display, addons/options, campaigns/combo presentation where exposed to customers.
- Images and loading/caching behavior.

Testing:
- Contract tests for menu/catalog responses.
- Widget/golden tests for major customer screens.
- Integration tests for location switching and availability changes.

## Phase 4 — Cart and pricing correctness

Migrate:

- Cart state and persistence.
- Quantity/addon changes.
- Minimum-order/rule validation.
- Discounts/referrals/coupons where currently supported.
- Taxes/fees/delivery calculations exactly as returned/validated by backend.
- Out-of-stock/price-change reconciliation before checkout.

Testing:
- High-coverage unit tests for client-side cart state.
- Backend remains source of truth for pricing/order validation.
- Integration scenarios for stale price, unavailable item, invalid coupon, minimum-order failure, and cart recovery.

## Phase 5 — Checkout, payments, orders

Migrate:

- Address/contact/checkout flow.
- COD and supported online payment methods.
- Razorpay/payment-provider mobile integration only in test mode until release approval.
- Payment success/failure/cancel/retry.
- Idempotent order creation/reconciliation.
- Order confirmation/history/detail/status.
- Invoice access where available.

Testing:
- Mocked unit/widget payment tests.
- Staging integration tests using payment test credentials only.
- Duplicate callback/idempotency cases.
- Network-loss during payment/order creation.
- Backend webhook/regression suite must remain green.

## Phase 6 — Native mobile capabilities

Implement and validate:

- Push notifications if currently required.
- App links/universal links.
- Native share/call/maps intents where applicable.
- Geolocation and permissions.
- App lifecycle/session restoration.
- Offline/degraded-network handling.
- Android back navigation.
- iOS safe areas/keyboard/navigation conventions.

## Phase 7 — End-to-end regression suite

Automate critical customer journeys on staging/test data:

1. Fresh install -> launch -> login/session creation.
2. Select location -> browse menu -> open item.
3. Add configurable item -> cart -> validate totals.
4. Checkout with COD -> order created -> order details/history.
5. Checkout with online payment test mode -> success -> single order.
6. Payment cancel/failure -> safe recovery without duplicate order.
7. Logout -> login -> session restoration.
8. Location switch -> catalog/cart behavior remains correct.
9. Out-of-stock/price-change during checkout -> backend validation surfaced correctly.
10. Invalid/expired auth -> reauthentication without corrupting state.
11. Network interruption and retry on key screens.
12. Account deletion/customer privacy flow.
13. Deep link/app link routing.
14. Android upgrade from existing Play Store identity once migration path is proven.
15. iOS install/TestFlight smoke flow.

Run E2E on representative Android and iOS device profiles and at least one physical device per platform before release.

## Phase 8 — CI/CD and quality gates

PR CI should include, as applicable:

- Backend Gradle tests.
- Frontend existing tests/lint/build.
- Flutter `dart format --set-exit-if-changed`.
- Flutter static analysis.
- Flutter unit/widget tests.
- Flutter Android debug/release-compilation gate without exposing signing secrets.
- Flutter iOS simulator build on macOS CI.
- E2E/integration suite against controlled staging when credentials/services are available.
- Secret scanning and dependency/security checks.

Store-release workflows must be separate/manual and environment-protected.

## Phase 9 — Release migration

Android:

- Validate whether the existing Play Store application can be upgraded using the same application ID and signing lineage.
- Preserve `in.broandbro.app` if compatible.
- Test upgrade from the currently published TWA version to Flutter, including local/session-state expectations.
- Roll out through internal/closed testing before production staged rollout.

Important: replacing TWA with Flutter removes the browser-hosted TWA architecture. The current Android manifest explicitly launches `com.google.androidbrowserhelper.trusted.LauncherActivity`; Flutter will instead launch a native Flutter activity.

iOS:

- Use the matching bundle identifier strategy.
- Complete Apple Developer membership, App Store Connect app record, certificates/profiles/API-key setup.
- Build/archive on macOS.
- Upload to TestFlight and complete internal testing before App Store submission.

## Regression policy

No phase is considered complete merely because the Flutter screen renders. For each migrated flow:

- Compare behavior against the existing production/reference web flow.
- Verify backend requests/responses and failure handling.
- Add automated tests before marking the flow complete.
- Keep existing backend/frontend regression tests green.
- Do not change API contracts casually; prefer backward-compatible additions.

## Definition of done

The Flutter migration is ready for production only when:

- Critical customer journeys pass E2E on Android and iOS.
- Existing backend test suite passes.
- Existing frontend regression suite/lint/build passes.
- Flutter unit/widget/integration tests pass.
- Android upgrade path/signing/package identity verified.
- iOS signing/TestFlight verified.
- Payment test-mode validation passes with no duplicate-order behavior.
- Deep links, permissions, network recovery, session restoration, and account deletion are validated.
- No high/critical security findings remain.
- Production rollout has an explicit rollback/staged-release plan.

## First implementation slice

After the baseline regression run, implement only the Flutter foundation and authentication/location shell first. Do not start checkout/payment implementation until navigation, environment configuration, API/auth/session handling, and CI tests are stable.
