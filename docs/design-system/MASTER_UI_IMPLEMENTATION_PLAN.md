# Bro & Bro Master UI/UX Implementation Plan

Status: ACTIVE SOURCE OF TRUTH

This file is the execution source for the UI/UX redesign. The current repository is always authoritative if it conflicts with this document.

## 1. Hard scope

- Repository only; do not import requirements from memory or unrelated projects.
- Backend is forbidden: no backend source, API, schema/migration, authorization, pricing, payment, order or server-side behavior changes.
- Existing frontend behavior/state/service contracts must remain unchanged.
- Allowed changes: presentation, layout, styling, component composition, responsiveness, accessibility and motion.
- Do not invent unsupported functionality, including delivery-specific behavior.
- Food Pop and Food Flow are visual experiences over the same application state and functionality.

## 2. Brand/design guardrails

- Preserve repository-approved Bro & Bro logo, wordmark, naming and assets.
- Shared brand tokens are separate from experience semantic tokens.
- Food Pop: energetic, expressive, promotional, food-forward.
- Food Flow: premium, clean, compact, commerce-oriented.
- Difference comes from composition, hierarchy, spacing, density, elevation and motion, not rebranding.
- Neumorphism excluded.

## 3. Protected frontend dependencies

Protected state contexts:
`AdminDashboardContext`, `AuthContext`, `CartContext`, `LocationContext`, `PartnerContext`, `PreferencesContext`.

Protected hooks include:
`use-mobile`, `useAnalytics`, `useByocDiscount`, `useCheckoutPromotions`, `useCountdown`, `useDebounce`, `useItemAddons`, `useOrderMutations`, `useScrollVisibility`.

Protected query/service families include auth, analytics, category, menu, inventory, combos, coupons, promotions, recommendations, Hall of Happiness, orders, party orders, wallet, partner, vendor, invoice/ops and image/upload flows. UI work consumes these contracts as-is.

## 4. Execution rule used by every phase

For every route/component slice:
1. inspect current repository implementation;
2. capture visible behavior, props, callbacks, guards and data/state dependencies;
3. identify all consumers before changing shared UI;
4. define Food Pop and Food Flow presentation;
5. implement responsive presentation;
6. verify loading/empty/error/disabled/success/selected states that already exist;
7. verify keyboard/focus/labels/touch targets;
8. run relevant frontend checks;
9. update coverage status.

Status values: `NOT_AUDITED`, `AUDITED`, `IN_PROGRESS`, `IMPLEMENTED`, `VERIFIED`, `BLOCKED`.

---

# Phase 0 — Full frontend inventory and dependency map

Goal: establish complete UI/dependency coverage before broad implementation.

Low-level work packages:
- enumerate every file under `frontend/src/routes/**`; map actual TanStack URL, parent layout, route guard, params, imports, states and tests;
- enumerate every visual file under `frontend/src/components/**`; record exported components, props, callbacks, consumers, conditional states, responsive behavior and accessibility;
- enumerate `features/**`, especially `features/food-court` screens/sheets versus protected context/hooks/api files;
- map all contexts/hooks/query/services used by visible UI and mark behavior semantics protected;
- audit `index.css`, `styles/**`, `assets/**`, `content/**`, UI-relevant `lib/**`, `main.jsx`, `router.jsx`, `routes/__root.jsx`;
- map every modal/dialog/drawer/sheet/off-canvas/toast independently;
- capture responsive baseline at 320/375/411/768/1024/1440;
- map current tests/build/lint/CI gates;
- assign every visual route/component to exactly one primary phase.

Known component families requiring recursive coverage:
`components/admin/**`, `analytics/**`, `charts/**`, `featured-segments/**`, `hall-of-happiness/**`, `home/**`, `orders/**`, `partner/**`, `shared/**`, `ui/**`, `wallet/**`.

Exit: every visible route/component and protected dependency has a matrix row and phase owner; zero backend changes.

---

# Phase 1 — Design foundation and shared primitives

Goal: create visual infrastructure without behavior changes.

## 1.1 Token baseline
Audit repository values from `index.css`, `styles/**`, `assets/**` and current component classes. Define shared brand tokens plus Food Pop/Food Flow semantic tokens for surfaces, text, CTA, borders, elevation, typography, spacing, radii, motion, focus, destructive/success/warning/info states, z-index and responsive layout.

## 1.2 UI primitive coverage
Every file in `components/ui/**` is covered. Known primitives include `ComboBoxCreate`, accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button, button-group, calendar, card, carousel, chart, checkbox, collapsible, combobox, command, context-menu, dialog, direction, drawer, dropdown-menu, empty, field, generated-avatar, input, input-group, input-otp, label, navigation-menu, password-input, phone-input, popover, radio-group, scroll-area, select, separator, sheet, sidebar, skeleton, sonner, switch, table and all remaining repository primitives.

For each primitive preserve its API/behavior, then verify hover/focus/pressed/disabled/error, keyboard, screen-reader name and mobile touch target.

## 1.3 Shared controls/feedback
Cover `Toast`, `ErrorBoundary`, `ConfirmDialog`, `QuantitySelector`, `SegmentedFilter`, `ModeSwitcher`, `LocationSelector`, `SectionLocationSelector`, `registration-purpose-control`, `MenuItemTagInput` and shared empty/loading/error patterns.

Exit: shared primitive contracts are stable and VERIFIED for both experiences before consumers are broadly restyled.

---

# Phase 2 — Global shell, authentication and public utility pages

## 2.1 Shell
Files: `main.jsx`, `routes/__root.jsx`, `components/shared/Navbar.jsx`, `MobileMenu.jsx`, `SiteFooter.jsx`, global error/toast hosts. `router.jsx` and generated route tree are integration/reference only.

Preserve provider order, auth/location/cart indicators, route targets, overlay ownership and initialization state. Redesign desktop/mobile navigation and safe-area behavior only.

## 2.2 Authentication
Routes: `(auth)/login.jsx`, `(auth)/register.jsx`, `(auth)/forget-password.jsx`, `change-password.jsx`.
Components: `PasswordResetForm`, `OTPVerifyDialog` where consumed, `registration-purpose-control`.
Preserve validation, submit, OTP/password and redirect semantics.

## 2.3 Public/information pages
Routes: `about-us`, `business-information`, `contact-us`, `faqs`, `food-safety`, `fssai-information`, `grievance-redressal`, `help-support`, `privacy-policy`, `refund-cancellation-policy`, `terms-and-conditions`, `account-deletion`, plus `success`/fallback presentation where applicable.
Shared component: `CompanyInfoPage`.

Exit: shell/auth/public routes VERIFIED in both experiences and all current actions/validation unchanged.

---

# Phase 3 — Customer discovery, home, search, categories and menu

## 3.1 Home
Route: `routes/index.jsx`.
Components: `home/ImmersiveHomeHero`, `HomeCampaignRails`, `CampaignPresentationView`, `CelebrationAmbientLayer`, `GuestOrderNotice`, `HomeMrpProductsSection`, `LocationLandingPage`. Preserve `campaignActions`/`campaignPresentation` semantics.

## 3.2 Featured segments
Cover `FeaturedSegment`, `FeaturedSegmentCarousel`, `FeaturedSegmentHeader`, `HeroProductCard`, `QuickCollections`; keep `segmentConfig`/`segmentVariants` behavior intact.

## 3.3 Search/category/essentials
Routes: `search.jsx`, `categories.$categoryId.jsx`, `essentials.jsx`.
Components: `shared/SearchBar`, `CategoryTabs`, `CategoryDishCard`, `RetailProductCard`. Preserve `useDebounce`, category IDs, filters and navigation.

## 3.4 Product/menu component family
Cover `MenuItemCard`, `MenuItemActionButton`, `ProductDetailDialog`, `ProductModal`, `QuantitySelector`, `RecommendedBundleCard`, `CompleteMealCard`, `RetailProductCard`, `CategoryDishCard`. Verify available/unavailable, zero/non-zero quantity, image/no-image, selected/add-on and long-content states.

## 3.5 Promotions/recommendations/combos
Cover `PromotionCard`, `PromotionDrawer`, `RecommendedBundleCard`, `CombosDrawer`, `BuildYourOwnComboDrawer`, `ComboProgressBanner`, `CompleteMealCard`. Preserve recommendation/combo query/service behavior and `useByocDiscount` semantics.

Exit: home/search/category/essentials/menu/product/promotion/combo discovery VERIFIED before transaction work is closed.

---

# Phase 4 — Cart and customer transaction presentation

## 4.1 Cart route/components
Route: `cart.jsx`.
Components: `OffCanvasCart`, `StickyCartBar`, `shared/CartItem`, `shared/QuantityUpdater`, `QuantitySelector`.
Protected: `CartContext`, `useCheckoutPromotions`, `useItemAddons`, cart/order service/query behavior.

Capture and preserve line-item controls, totals, offers, validations and continue/submit actions. Redesign hierarchy, summary, sticky actions and mobile/desktop composition only.

## 4.2 Transaction overlays
Cover `ConfirmDialog`, `OTPVerifyDialog`, product/add-on/combo overlays invoked from cart. Preserve trigger, retry, cancel, confirm and loading/error semantics.

## 4.3 Promotion state
Show the same applied/available/ineligible states returned by existing behavior; presentation only.

## 4.4 Handoff
Verify `success.jsx` where current transaction flow uses it; preserve identifiers/navigation.

Exit: cart/overlay/handoff VERIFIED with calculations, API, order and payment behavior unchanged.

---

# Phase 5 — Orders, profile, preorder, party order and Hall of Happiness

## 5.1 Orders
Route: `orders.jsx`.
Components: top-level `OrderCard`, `OrderList`, `components/orders/OrderCard`, `orderPresentation.js`. Preserve order queries, `useOrderMutations` and order service behavior.

## 5.2 Preorder
Cover `CustomerPreOrderDialog`, `CountdownTimer` where consumed. Preserve date/time/selection/submit semantics.

## 5.3 Party orders
Routes: `party-orders.jsx`, `new-party-order.jsx`.
Components: `PartyOrderBanner`, `UserPartyOrderCard`, `shared/NewPartyOrder`. Preserve validation/status/actions and party-order service behavior.

## 5.4 Hall of Happiness customer
Route: `hall-of-happiness.jsx`.
Components: `HallOfHappinessSection`, `CustomerHallPhotoUpload`, `hall-of-happiness/CustomerMemoryDetailView`. Preserve consent/upload/revocation/status semantics.

## 5.5 Profile/utilities
Routes: `profile.jsx`, `milestones.jsx`. Password/account-deletion presentation remains owned by Phase 2. Wallet is assigned to Phase 10.

Exit: customer post-order/secondary flows VERIFIED with state/mutations unchanged.

---

# Phase 6 — Admin shell and shared admin design system

## 6.1 Shell
Routes: `admin.jsx`, `admin/index.jsx`.
Components: `AdminHeader`, `AdminSidebar`, `RoleGuard`, `SectionLocationSelector`. Preserve role/location/access semantics and navigation targets.

## 6.2 Shared admin controls/overlays
Cover `AdminMenuFilters`, `CategoriesScroll`, `SummaryMetrics`, `CouponForm`, `PromotionForm`, `BulkCostEditSheet`, `BulkMenuUploadModal`, `CampaignImageGenerationModal`, `CategoriesManageModal`, `CategoryImageGenerationModal`, `MissingImagesSheet`.

## 6.3 Analytics primitives/charts
Components: `analytics/AnalyticsPageHeader`, `AnalyticsTable`, `ChartContainer`, `MetricCard`, `States`; charts `HeatmapGrid`, `MultiBarChart`, `OrdersBarChart`, `PieAnalyticsChart`, `RevenueLineChart`. Preserve all datasets/query semantics.

## 6.4 Dashboard/control-center foundation
Cover `admin/dashboard/DashboardCharts`, `DashboardPanels`, `DashboardPrimitives`, plus shared `ControlCenter`, `ControlCenterIcon`, `ControlCenterThumbnail` presentation.

Exit: shared admin shell/filters/forms/overlays/analytics patterns VERIFIED before route-family implementation.

---

# Phase 7 — Admin menu, catalog, promotions and growth

Routes:
- menu: `admin/(menu)/menu`, `manage-menu`, `classification`, `global-products`, `mrp-product`, `meal-roles`, `home-content/index`, `combo-campaigns/index`;
- growth: `recommendations`, `item-recommendations`, `combo-opportunities`, `cart-rules`, `auto-suggestions`;
- promotions/config: `admin/(coupons)/coupons`, `admin/(promotions)/promotions`.

Components include `AdminMenuItem`, `AdminMenuFilters`, `MenuItemEditModal`, `MenuItemTagInput`, `AddonGroupsSection`, `ClassificationSection`, category/bulk/image-generation components, `admin/combo/ComboCampaignForm`, `EditComboOpportunityDrawer`, `CouponForm`, `PromotionForm`.

Preserve menu/category/classification/inventory/MRP/combo/promotion/recommendation query/service semantics and all create/edit/delete/visibility/availability behavior.

Verify loading, empty, filtered-empty, validation, save/delete progress, disabled controls, success/error and large-table/mobile overflow.

Exit: every catalog/growth/promotion route and overlay VERIFIED.

---

# Phase 8 — Admin orders, operations, analytics, control center and management

## 8.1 Order operations
Routes: kitchen-queue, operational-queue, service-board, pre-orders, party-orders, Hall of Happiness admin.
Known components: `OrderDetailPanel`, `OrderItem`, `FlaggedOrders`, `PreOrderCard`, `CreatePreOrderDialog`, `PartyOrderCard`, `PartyOrderEstimateDialog`.

Admin Hall of Happiness components include `AddMemoryFlow`, `FilterSheet`, `HeroMoment`, `KPIStrip`, `MemoryCard`, `MemoryDetailView`, `MemoryGrid`, `QuickFilterPills`, `SearchToolbar` and every remaining file in that component directory.

## 8.2 Operations
Routes: refunds, manual-invoices, admin milestones, ops-center, background-tasks. Preserve refund/invoice/ops/milestone behavior.

## 8.3 Analytics routes
`admin/analytics/index`, `overview`, `users`, `sales`, `orders`, `menu`, `coupons`, `recommendations`, `profitability`. Use Phase 6 primitives and preserve query/data transformations.

## 8.4 Control center
Routes: `admin/control-center/index`, `wallet`, `users`, `payments`, `locations`, `invoice-management`, `customer-companies`, `access`. Preserve permission/access/action semantics.

## 8.5 Management/settings
Routes: `admin/vendors`, `vendor-bills`, `partners`, `customer-companies`, settings, global-controls. Preserve vendor/partner/management services.

Exit: operational/analytics/control-center/management routes VERIFIED with role/action semantics intact.

---

# Phase 9 — Food-court feature module

Feature files:
- `FoodCourtDashboard.jsx`;
- visual: `OverviewScreen`, `CoreSheets`, `FinanceScreens`, `FinanceSheets`, `ManageScreens`, `OpsScreens`, `OpsSheets`, `SheetHost`, `kit.jsx`, `shared.jsx`;
- protected: `context.jsx`, `hooks.js`, `api.js`, `keys.js`; `format.js` remains behavior/formatting dependency.

Route integration: `admin/(foodcourt)/food-court.jsx`.

Low-level sequence:
1. align local kit/shared primitives with Phase 1 tokens;
2. redesign dashboard shell/navigation while preserving context state;
3. cover overview;
4. enumerate every exported core sheet;
5. cover finance screens/sheets;
6. cover management screens;
7. cover ops screens/sheets;
8. verify sheet host open/close/state behavior;
9. verify admin shell integration.

Exit: every exported feature screen/sheet VERIFIED; context/api/hooks/key semantics unchanged.

---

# Phase 10 — Partner, vendor, wallet and residual coverage

## 10.1 Partner shell
Routes: `partner.jsx`, `partner/index.jsx`.
Components: `PartnerRouteGuard`, `PartnerNotificationBell`, `PartnerComponents`; `PartnerContext` and partner services protected.

## 10.2 Partner routes
`users`, `reports`, `profile`, `performance`, `orders`, `orders/$orderId`, `notifications`, `menu`, `locations`, `locations/$locationId`, `insights`, `feedback`.
Components: `PartnerAnalyticsComponents`, `PartnerInsightsComponents`, `PartnerReportsComponents`.

## 10.3 Partner finance
Routes: `finance/index`, `finance/agreements`, `finance/settlements/index`, `finance/settlements/$settlementId`.
Components: `PartnerFinanceComponents`, `PartnerFinanceActions`. Preserve finance query/service semantics.

## 10.4 Vendor
Routes: `vendor.jsx`, `vendor/index.jsx`, `vendor/profile.jsx`. Preserve existing guard/state/actions.

## 10.5 Wallet
Route: `wallet.jsx`.
Components: `wallet/AddMoneyForm`, `CoinShower`. Preserve wallet query/service and existing amount/payment behavior.

## 10.6 Residual gap closure
Compare current route tree, recursive `components/**` and `features/**` against coverage matrix. Any unassigned visual file is added here and must reach VERIFIED. No visual surface may remain only implicitly covered.

Exit: partner/vendor/wallet and all residual visible surfaces VERIFIED; zero `NOT_AUDITED` visual surfaces.

---

# Phase 11 — Responsive, accessibility and visual-regression hardening

For every major route family verify 320/375/411/768/1024/1440.

Responsive checks: navigation, grid/list density, sticky/fixed elements, overflow, images, dialogs/drawers/sheets, long text/numbers, touch targets, safe area.

Accessibility checks: landmarks/headings, labels, keyboard traversal, visible focus, overlay focus trap/return, screen-reader names, contrast, form-error association, disabled/hidden semantics, reduced motion.

Regression checks: re-test every shared overlay and high-fan-out component across all consumers, especially Navbar/MobileMenu, MenuItemCard, quantity controls, ProductDetailDialog, cart components, order cards, admin primitives, analytics primitives, partner primitives and food-court kit.

State matrix: loading, skeleton, empty, error, disabled, success, selected/active, expanded/collapsed, destructive confirmation, no-image/slow-image, long content.

Exit: no major responsive/accessibility/shared-component regression remains open.

---

# Phase 12 — Final non-regression and completion audit

1. Compare current `routeTree.gen.ts` imports with route coverage; every route must be VERIFIED, a documented non-visual wrapper, or explicitly exempt with evidence.
2. Compare recursive `components/**` with component coverage; every visual component VERIFIED or documented unused/non-visual.
3. Verify every visual export in `features/**`.
4. Audit final diff for protected `context/**`, `hooks/**`, `query/**`, `services/**`, guards and cart/order/payment/wallet/partner behavior; revert semantic redesign changes.
5. Confirm final diff contains no backend implementation changes.
6. Re-run existing functional paths: auth, navigation, location, search, menu/product add/update, combos/promotions, cart, orders, preorder/party orders, Hall of Happiness, profile, wallet, admin menu/growth, admin operations/analytics/control center, food-court, partner/vendor.
7. Run repository-defined frontend build/test/lint checks and record actual results.
8. Verify Food Pop/Food Flow use identical data/state/behavior, preserve brand identity and do not reset protected state.
9. Close route/component/dependency matrices and blockers.

Exit: all visual surfaces VERIFIED, frontend gates pass, protected behavior unchanged, backend changes NONE, unsupported functionality NONE.

---

## 5. Coverage matrix

Each implementation slice must update:

| Surface | Route/File | Phase | Shared dependencies | Protected dependencies | Existing behavior captured | Food Pop | Food Flow | Mobile | Tablet | Desktop | States | Accessibility | Tests/build | Status |
|---|---|---:|---|---|---|---|---|---|---|---|---|---|---|---|

No surface is complete before `VERIFIED`.

## 6. File classification

- Presentation: may be redesigned.
- Shared UI: may be redesigned only after consumers are mapped.
- Frontend behavior/state: semantics protected.
- Service/integration/query: contracts protected.
- Infrastructure/generated: do not hand-edit unless necessary and understood; generated route tree is reference-only.

## 7. Backend protection

If a UI task appears to require backend work, mark that subtask `BLOCKED` and document the incompatibility. Do not change backend code. Consume existing response shapes as-is.

## 8. PR discipline

Every implementation PR must reference this plan, name phase/work packages, list changed routes/components, state `Backend changes: NONE`, list preserved functionality, include responsive/accessibility evidence where relevant, include actual frontend check results and update coverage statuses.

## 9. Source-of-truth rule

Before every implementation step: read this plan, inspect current repository implementation, confirm dependencies/consumers, implement presentation-only changes, run checks and update coverage. If repository reality conflicts with the plan, update this file first; repository reality wins.

## 10. Planning status

- Phase 0: low-level inventory design defined; inventory remains living as repository changes.
- Phases 1–12: low-level implementation design defined above.
- Runtime implementation must proceed phase-by-phase and dependency-first using this plan plus current repository evidence.
