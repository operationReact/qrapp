# Bro & Bro Cross-Platform Flutter Migration Plan

## Baseline

- Source branch: `main`
- Feature branch: `feature/flutter-mobile-migration`
- Baseline commit: `198ee6f9a729daf24e0b707a9fdc2ea6b4dbd8aa`
- Existing web/customer app: React 19 + Vite + TanStack Router/Query
- Existing Android packaging: Trusted Web Activity (TWA)
- Existing Android application ID / namespace: `in.broandbro.app`
- Backend: Spring Boot 3.4.4, Java 17, Gradle, PostgreSQL/Flyway, Spring Security, JPA

## Product expectation

The migration is not Android-only. Bro & Bro must remain a complete cross-platform product with three supported client surfaces:

1. Web: preserve the existing React website and improve its customer UI/UX without breaking admin/partner or existing web functionality.
2. Android: replace the browser/TWA customer shell with a real Flutter Android application and preserve the existing Play Store identity where signing compatibility permits.
3. iOS: ship the same Flutter customer experience as a native iOS application, using the same backend and business rules.

The Android and iOS customer apps should share one Flutter codebase. The React web application remains supported rather than being removed. The Spring Boot backend remains the source of truth for authentication, catalog, availability, pricing, orders, payments and business rules.

## UI/UX target

Enhance the customer experience rather than mechanically copying the current web UI. Preserve Bro & Bro branding while improving:

- mobile-first hierarchy and navigation;
- polished home/category/menu/item cards;
- consistent typography, spacing, iconography and imagery;
- loading skeletons and meaningful empty/error/offline states;
- cart and checkout clarity;
- responsive web behavior;
- Android/iOS safe areas, keyboard behavior and native navigation conventions;
- accessibility, touch targets and contrast;
- perceived performance through image caching, pagination/lazy loading and controlled animations.

Functional parity takes priority over visual redesign: no feature may silently disappear during UI enhancement.

## Architecture

`backend/` remains the shared Spring Boot API/business layer.

`frontend/` remains the React/Vite web application and must continue to build, test and deploy independently.

`mobile/` will contain the Flutter application shared by Android and iOS.

The existing root `android/` TWA project remains available as the release reference until the Flutter Android upgrade/signing path is verified. Do not delete it early.

## Phase 0 — Baseline, inventory and regression safety

- Inventory all customer-facing routes, API calls and user journeys in the React web app.
- Inventory auth/session, location, catalog, search, item/addon, cart, pricing, coupon/referral, checkout, payment, order, invoice, profile, account-deletion, deep-link and notification behavior.
- Run backend Gradle tests.
- Run every existing frontend test, lint and production build.
- Record current Android package/signing/TWA configuration.
- Establish controlled dev/staging API and payment test-mode requirements.
- Add CI gates that exercise backend, web and Flutter independently.

Exit gate: existing web/backend baseline must be green before a migrated flow is considered complete.

## Phase 1 — Flutter foundation

Create `mobile/` with Android and iOS targets, environment configuration, routing, API client, typed models, secure session storage, state management, design tokens, reusable UI components and standard loading/error/offline/retry states.

Use `in.broandbro.app` as the intended Android identity, subject to release-signing verification. Use the corresponding iOS bundle-ID strategy.

Tests: format, static analysis, Dart unit tests, widget tests, navigation tests, Android compile and iOS simulator compile.

## Phase 2 — Shared design system and web UI enhancement

Define reusable Bro & Bro design tokens for color, typography, radius, spacing, elevation, icon sizing and interaction states. Apply the same product language to Flutter and incrementally improve the React customer website without forcing identical platform layouts.

Web-specific regression gates remain mandatory: existing routes, admin/partner access, responsive layouts and deployment behavior must not regress.

## Phase 3 — Authentication, profile and location

Implement Flutter login/session restore/logout, profile, account deletion, location discovery/selection, geolocation permission handling and required deep links. Preserve existing backend contracts wherever possible.

## Phase 4 — Home, discovery and menu

Implement enhanced home, categories/stalls, search/filtering, menu browsing, item details, availability, veg/non-veg presentation, addons/options, campaigns/combos and image caching/loading.

Add widget/golden tests and API-contract tests. Compare migrated behavior against the existing web reference.

## Phase 5 — Cart and pricing

Implement cart persistence, quantity/addon changes, minimum-order rules, coupons/referrals/discounts, backend-authoritative taxes/fees/delivery totals, and stale-price/out-of-stock reconciliation.

Pricing correctness is a release blocker.

## Phase 6 — Checkout, payments and orders

Implement address/contact checkout, COD and supported online payment flows. Online payments remain in test mode until release approval. Handle payment success/failure/cancel/retry, idempotent order creation, network interruption, order history/details/status and invoice access.

Backend webhook/payment regression tests must remain green.

## Phase 7 — Native capabilities

Implement and verify push notifications where required, Android app links, iOS universal links, geolocation, share/call/maps intents where applicable, app lifecycle/session restoration, offline/degraded-network handling, Android back behavior, iOS safe areas and keyboard/navigation conventions.

## Phase 8 — End-to-end regression

Automate the critical journeys against controlled staging/test data:

1. Fresh install/launch -> authentication/session creation.
2. Location selection -> home -> category/menu -> item.
3. Configurable item/addons -> cart -> totals.
4. COD checkout -> exactly one order -> order detail/history.
5. Online payment test-mode success -> exactly one order.
6. Payment cancel/failure/network loss -> safe recovery and no duplicate order.
7. Session expiry -> reauthentication and state recovery.
8. Location switch -> correct catalog/cart behavior.
9. Price/availability change during checkout -> backend validation displayed correctly.
10. Invalid coupon/minimum-order failure -> correct UX.
11. Offline/retry behavior on critical screens.
12. Account deletion/privacy flow.
13. Deep/app/universal link routing.
14. Android upgrade from the currently published identity.
15. iOS/TestFlight smoke journey.
16. Responsive web smoke journey covering the equivalent browse/cart/checkout/order flows.
17. Admin and partner web smoke checks to ensure customer UI work did not break those modules.

Run mobile E2E on representative Android/iOS profiles and at least one physical device per platform before production release.

## Phase 9 — CI/CD quality gates

Every migration PR should run, as applicable:

- backend Gradle tests;
- existing frontend tests;
- frontend lint;
- frontend production build;
- Flutter formatting;
- Flutter static analysis;
- Flutter unit/widget tests;
- Android compilation;
- iOS simulator compilation on macOS;
- E2E/integration tests against controlled staging when available;
- secret/dependency/security checks.

Store-release workflows remain separate, manual/environment-protected and must never be triggered merely by feature-branch work.

## Phase 10 — Release

### Web

Deploy enhanced React customer UI only after web regression/E2E gates pass. Preserve admin/partner functionality and rollback capability.

### Android

Verify the Flutter build can update the existing Play Store application using the same application ID/signing lineage. Test upgrade from the currently published TWA version before staged rollout. The final Flutter app must launch natively and must not expose the `broandbro.in` browser bar.

### iOS

Complete Apple Developer/App Store Connect/signing setup, archive on macOS, upload to TestFlight, execute internal testing, then prepare App Store submission.

## Regression policy

A phase is not complete because a screen renders. For every migrated or redesigned flow:

- compare behavior with the existing working flow;
- verify backend request/response and failure handling;
- add automated tests;
- keep backend and React web regression gates green;
- maintain backward-compatible API contracts unless an explicit API change is justified;
- validate Android and iOS behavior independently where platform behavior differs.

## Definition of done

The migration is production-ready only when:

- web, Android and iOS supported flows meet agreed functional parity;
- enhanced UI passes responsive/accessibility/platform checks;
- backend tests pass;
- React tests/lint/build pass;
- Flutter format/analyze/unit/widget/integration tests pass;
- critical E2E journeys pass;
- Android package/signing upgrade path is verified;
- iOS signing/TestFlight is verified;
- payment tests show no duplicate-order behavior;
- deep links, permissions, session restoration, network recovery and account deletion are validated;
- no high/critical security findings remain;
- each production surface has a staged rollout/rollback strategy.

## Implementation order

Start with Phase 0 and Phase 1. Build the Flutter foundation alongside the existing web app; do not replace or delete the current web/TWA implementation during early development. Once foundation and CI are stable, implement auth/location and then migrate customer journeys incrementally, adding tests with every slice.