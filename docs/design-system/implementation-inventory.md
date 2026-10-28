# Bro & Bro Dual-Design Implementation Inventory

Status: Phase 0 working inventory. This document records repository evidence and implementation gates before visual implementation. Do not guess missing product or brand specifications.

## Architecture baseline

| Area | Current/reference implementation | Target | Notes |
|---|---|---|---|
| Backend | Spring Boot 3.4.4 / Java 17 / Gradle / PostgreSQL/Flyway | Shared backend | Remains business-rule and authorization source of truth |
| Customer web | React 19 + Vite + TanStack Router/Query | Flutter Web customer experience | Existing React behavior remains migration reference |
| Android | TWA, application ID `in.broandbro.app` | Flutter Android | Preserve package/signing lineage before Play upgrade |
| iOS | Prior/draft packaging work must be audited | Flutter iOS | Signing/TestFlight remains a separate release gate |
| Admin/partner | Existing web implementation | Preserve unless explicitly migrated | Access control and existing functionality are non-regression requirements |

## Mandatory design architecture

Both customer experiences are first-class implementations over the same domain/application state:

- Food Pop
- Food Flow

Shared: APIs, repositories, models, authentication/session, location, cart, checkout, payment, orders, permissions and business rules.

Variant-specific: semantic visual tokens, layout composition, hierarchy, density, motion/elevation and component renderers where necessary.

Switching variants must not reset navigation, URL/deep link, forms, authentication, location, cart, checkout, orders or ongoing actions.

## Brand-DNA audit checklist

Before creating visual tokens or screens, identify repository/Figma-approved source-of-truth for:

- [ ] primary logo asset
- [ ] wordmark asset
- [ ] approved primary/secondary colors
- [ ] typography/typefaces
- [ ] iconography rules/assets
- [ ] illustration/photography language
- [ ] naming and customer-facing tone
- [ ] signature motifs/patterns
- [ ] current production examples
- [ ] accessibility/contrast constraints

Do not infer missing exact colors or replace assets. Neumorphism is prohibited.

## Customer feature inventory

Each row must ultimately be verified for Food Pop + Food Flow and applicable Web/Android/iOS targets.

| Capability | Existing behavior/API to audit | Flutter implementation gate |
|---|---|---|
| Launch/session restore | React/TWA auth/session flow | deterministic startup + persisted design preference |
| Authentication | login/session/logout | shared auth state, design-independent |
| Location | discovery/selection/geolocation | shared selected location, permission handling |
| Home/discovery | home, categories, stalls, campaigns | dual composition + responsive desktop |
| Search/filter | customer discovery/search | shared query/domain state |
| Menu | category/stall/menu/availability | both variants + loading/error states |
| Item detail | addons/options/customization | preserve selections while switching design |
| Cart | quantity/addons/persistence | shared cart state; never reset on design switch |
| Offers | coupons/referrals/discounts | backend-authoritative validation |
| Pricing | GST/fees/delivery/minimum order | backend authoritative; release blocker |
| Checkout | address/contact/summary | state preserved across variant switch |
| COD | order creation | exactly-once behavior |
| Online payment | supported provider flow | test mode until release approval; idempotency required |
| Orders | confirmation/history/detail/status | shared order state |
| Invoice | invoice access/download | preserve existing GST/invoice rules |
| Profile | customer details/preferences | include Appearance -> Experience |
| Account deletion | privacy/deletion flow | preserve existing policy and behavior |
| Hall of Happiness | customer gallery/consent behavior | dual-design coverage |
| Deep links | web/app/universal links | stable across variants/platforms |
| Notifications | current notification behavior | platform adapter where required |
| Offline/retry | current degraded-network behavior | standard cross-platform states |

## Responsive/platform verification matrix

Minimum representative widths for visual checks: 320, 375, 411, 768, 1024 and 1440 px where applicable.

For Web/desktop verify keyboard navigation, focus, pointer/hover semantics, URLs/deep links and responsive navigation. For Android/iOS verify safe areas, keyboard, back/navigation conventions, permissions, lifecycle and native integrations.

## Brand consistency matrix template

| Check | Food Pop Web | Food Flow Web | Food Pop Android | Food Flow Android | Food Pop iOS | Food Flow iOS |
|---|---|---|---|---|---|---|
| Approved logo/wordmark | pending | pending | pending | pending | pending | pending |
| Approved palette | pending | pending | pending | pending | pending | pending |
| Typography | pending | pending | pending | pending | pending | pending |
| Iconography | pending | pending | pending | pending | pending | pending |
| Brand CTA/navigation accents | pending | pending | pending | pending | pending | pending |
| Accessibility/contrast | pending | pending | pending | pending | pending | pending |

## Phase 1 foundation implementation order

1. Establish Flutter Web + Android + iOS project targets.
2. Add environment/configuration boundary and shared API/repository/session architecture.
3. Add typed design variant and persisted preference repository.
4. Extract approved shared brand tokens from audited source assets/specification.
5. Add Food Pop/Food Flow semantic token layers without duplicating brand identity.
6. Add design controller independent of domain state.
7. Add responsive/adaptive application shell and navigation primitives.
8. Add accessible Appearance -> Experience selector with preview cards.
9. Add common loading/error/empty/offline/retry components.
10. Add unit/widget/responsive/variant-persistence/state-preservation tests and platform CI gates.

## Acceptance rule

No customer UI slice is complete merely because it renders. It must work in both Food Pop and Food Flow, preserve Bro & Bro brand DNA, preserve shared business state, satisfy applicable responsive/platform behavior and have automated evidence.