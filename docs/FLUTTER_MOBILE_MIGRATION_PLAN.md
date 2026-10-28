# Bro & Bro Cross-Platform Flutter Migration Plan

## Baseline

- Source branch: `main`
- Feature branch: `feature/flutter-mobile-migration`
- Baseline commit: `198ee6f9a729daf24e0b707a9fdc2ea6b4dbd8aa`
- Existing customer reference: React/Vite web + Android TWA
- Existing Android application ID / namespace: `in.broandbro.app`
- Backend: Spring Boot 3.4.4, Java 17, Gradle, PostgreSQL/Flyway, Spring Security, JPA
- Dual-design specification: PR #234 / `docs/design-system/dual-design-system-requirements.md`

## Target product architecture

Bro & Bro customer experience is a production-grade Flutter product across Web + Android + iOS, backed by the existing Spring Boot APIs. The existing React/TWA implementation remains a functional and brand reference during migration; it is not the target customer architecture. Admin/partner behavior must remain supported and must not be casually rewritten outside agreed scope.

Flutter must use responsive/adaptive composition rather than stretching a phone UI onto desktop. Platform-specific integrations are permitted where required while domain/business behavior remains shared.

## Mandatory dual-design architecture

Every customer-facing feature must support two first-class selectable experiences:

1. **Food Pop** — expressive, promotional, energetic composition and strong food-led calls to action.
2. **Food Flow** — premium, clean commerce composition, compact discovery and low-friction ordering.

These are not color themes. Both experiences share authentication, location, repositories, API clients, models, cart, checkout, payments, orders and all other domain/application state. Business logic must never be duplicated by design variant.

Implement a typed design variant, persisted preference repository, design controller/provider, adaptive shell, semantic component contracts and variant-specific renderers/compositions where needed. Switching variants must preserve URL/deep link, navigation stack, forms, authentication, selected location, cart/order/checkout state, permissions and ongoing actions.

## Mandatory brand-DNA contract

Dual design does not authorize rebranding. Brand identity is immutable unless explicitly approved by the product owner.

Before visual implementation, audit production branding and approved assets: logo, wordmark, brand colors, typography, icon/illustration language, naming, tone and recognizable motifs. Approved assets are source of truth; never guess missing hex values or invent replacement branding.

Centralize **shared brand tokens separately from experience-specific semantic tokens**. Food Pop and Food Flow must retain the approved Bro & Bro logo/wordmark, palette, naming and signature brand cues. Distinguish variants through layout, hierarchy, spacing, component composition, density, elevation and motion rather than replacing the brand palette. Primary CTAs, active navigation, highlights and appropriate accents must remain recognizably brand-led with accessible contrast.

Neumorphism is explicitly excluded.

Every implementation PR affecting UI must demonstrate brand-DNA compliance. Maintain a brand-consistency matrix for Food Pop and Food Flow across supported Web/desktop, Android and iOS, covering logo placement, palette, typography, iconography and accessibility. Conflicting or missing brand specifications must be flagged rather than guessed.

## Feature coverage

Both variants must ultimately cover location selection, authentication/profile, food categories, stalls, discovery/search, menu, item customization/addons, cart, offers/coupons/referrals, checkout, payment, order tracking/history, invoices, Hall of Happiness, account deletion/privacy, deep links, notifications and relevant admin/partner experiences.

## Phase 0 — Audit and implementation inventory

- Audit actual repository architecture, customer routes/screens, APIs, auth/session, location, catalog, cart, checkout, payment, orders, invoices, profile, Hall of Happiness, admin/partner boundaries, deep links and notifications.
- Audit existing production branding and approved assets before creating new UI tokens.
- Audit React/Vite, Android TWA, draft iOS/Capacitor work, CI and tests. Do not assume a platform implementation exists without repository evidence.
- Create `docs/design-system/implementation-inventory.md` with screen/role/platform matrix, current implementation, migration gaps and precise implementation order.
- Establish current backend/frontend test/lint/build baseline and controlled dev/staging/payment-test requirements.

Exit gate: architecture, feature inventory and brand source-of-truth are documented sufficiently to implement without inventing product behavior or branding.

## Phase 1 — Cross-platform and dual-design foundation

Create the Flutter customer foundation with Web + Android + iOS targets. Add environment configuration, routing, typed models, API/repository layer, session abstraction, state management and common loading/error/offline/retry behavior.

Implement:
- typed `DesignVariant` (`foodPop`, `foodFlow`) or equivalent;
- persisted anonymous design preference and authenticated-preference reconciliation when backend support is available;
- design controller independent of business/domain state;
- shared immutable brand-token layer;
- Food Pop and Food Flow semantic token/theme layers;
- responsive breakpoints/layout primitives;
- adaptive navigation/application shell;
- accessible Appearance -> Experience selector with previews;
- shared semantic component contracts with variant renderers where composition differs;
- safe existing-user default without surprise automatic switching.

Use `in.broandbro.app` as intended Android identity subject to signing verification, with corresponding iOS bundle-ID strategy.

Tests must cover preference persistence, startup restoration, switching without state loss, both variants, responsive web widths, navigation and foundational accessibility behavior. CI gates: format, static analysis, Dart unit/widget tests, Flutter web build, Android compile and iOS simulator compile on macOS.

## Phase 2 — Dual-design vertical slice

Build Food Pop and Food Flow for the primary home/discovery/navigation experience plus one complete ordering vertical slice. Both must be recognizably Bro & Bro while genuinely distinct in composition.

Validate mobile and desktop responsive behavior, keyboard/pointer/focus on web, Android/iOS safe areas, touch targets, reduced motion and screen-reader semantics. Add golden/visual regression coverage where practical and brand-consistency evidence for both variants.

## Phase 3 — Full customer coverage

Extend both variants to all remaining customer flows and states, including loading, empty, error, offline and retry experiences. Preserve one shared domain/application layer. No feature is complete in only one design.

Admin/partner coverage must follow the approved scope while preserving existing behavior and access controls.

## Phase 4 — Quality gates and E2E

Run unit, widget, integration, E2E, visual/golden and accessibility tests for both Food Pop and Food Flow. Include design switching mid-flow and verify no loss of auth/location/cart/checkout/order state.

Critical journeys include launch/auth/location -> discovery/menu -> customization -> cart -> checkout -> COD/online-payment test mode -> confirmation/history, plus payment failure/cancel/network loss, session expiry, location switching, stale price/availability, invalid coupon/minimum order, offline/retry, account deletion/privacy and deep/app/universal links.

Capture representative visual evidence at 320/375/411/768/1024/1440px where applicable and maintain the brand-consistency matrix.

## Phase 5 — Controlled rollout

Introduce controlled rollout/feature-flag strategy, explicit preview/selection behavior, metrics for design choice and regression monitoring, plus fallback/rollback. No production deployment, store publishing or paid resource provisioning without explicit approval.

## Regression and implementation policy

- Existing backend remains authoritative for business rules and authorization.
- API changes must be backward-compatible unless explicitly justified.
- Preserve 3km delivery behavior, pricing/GST/invoices, location scoping, inventory and payment/order correctness.
- Do not duplicate business logic by platform or design.
- Do not hardcode arbitrary replacement palettes or unapproved brand assets.
- Implement in small reviewable branches/PRs; resolve ordinary CI/merge conflicts independently.
- Never conceal failing tests or assert implementation completion based on documentation alone.
- Production/store release workflows remain separate and protected.

## Definition of done

A customer feature is complete only when:
- it works in Food Pop and Food Flow on applicable Web, Android and iOS targets;
- both designs preserve Bro & Bro brand DNA;
- switching designs preserves shared application state and ongoing transactions;
- responsive/adaptive, accessibility and platform behavior are validated;
- automated tests for both designs pass;
- backend/API behavior remains correct;
- visual/brand evidence is available for important screens;
- no high/critical security issues remain.

The overall migration is production-ready only after Android signing/upgrade lineage, iOS signing/TestFlight, Flutter web deployment behavior, critical E2E, payments/no-duplicate-order behavior, deep links, permissions, session restoration, network recovery and rollout/rollback strategy are verified.

## Immediate implementation order

Proceed with **Phase 0 audit/inventory and Phase 1 foundation**. Brand-DNA discovery and shared brand-token extraction happen before visual token invention. Establish Food Pop/Food Flow as architectural primitives from the first Flutter screen; do not retrofit dual design later.