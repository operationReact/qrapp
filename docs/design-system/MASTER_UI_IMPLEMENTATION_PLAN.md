# Bro & Bro Master UI/UX Implementation Plan

Status: ACTIVE SOURCE OF TRUTH

This document is the execution plan for the UI/UX redesign. It must be consulted before every implementation step and updated whenever the frontend inventory or implementation scope changes.

## 1. Non-negotiable scope

- Source of truth: the current repository only.
- Backend is completely out of scope.
- Do not modify backend source, APIs, database schema/migrations, authorization, pricing, payment logic, order logic, or other server-side behavior.
- Preserve existing frontend behavior and business flows.
- UI/UX work may change presentation, layout, styling, component composition, responsiveness, accessibility, and motion only.
- Do not invent product functionality that is not present in the repository.
- Do not introduce delivery-specific UX or any other unsupported domain assumptions.
- Both design experiences must consume the same existing frontend/business state.

## 2. Design experiences

Two complete visual experiences are required:

### Food Pop
- energetic and expressive
- promotional emphasis
- bold food-forward composition
- stronger visual hierarchy and CTA treatment

### Food Flow
- premium and clean
- commerce-oriented
- compact and efficient information density
- minimal-friction navigation and task completion

These are visual/UX variants, not separate products and not separate business implementations.

## 3. Brand guardrails

- Preserve existing Bro & Bro logo, wordmark, brand identity, naming, and approved assets found in the repository.
- Shared brand tokens must be separated from experience-specific semantic tokens.
- Do not invent arbitrary replacement colors or assets.
- Distinguish Food Pop and Food Flow using composition, typography hierarchy, spacing, density, elevation, motion and component presentation.
- Neumorphism is excluded.

## 4. Repository areas to audit and cover

The redesign inventory must cover the complete frontend surface, including:

- `frontend/src/routes`
- `frontend/src/components`
- `frontend/src/features`
- `frontend/src/context`
- `frontend/src/hooks`
- `frontend/src/query`
- `frontend/src/services`
- `frontend/src/styles`
- `frontend/src/assets`
- `frontend/src/content`
- `frontend/src/lib`
- global CSS and application shell
- generated route tree only as a reference for route coverage

Existing frontend routing includes customer, authentication, admin, operational and other product surfaces. Shared components include customer commerce cards, dialogs, cart UI, location selectors, order components, promotional components, Hall of Happiness UI, admin components and other reusable primitives.

## 5. Implementation method

Every implementation phase follows this sequence:

1. Inspect the existing route/page/component implementation in the repository.
2. Record its current user-visible behavior and dependencies.
3. Identify shared components used by that surface.
4. Preserve all existing event/state/service behavior.
5. Define Food Pop presentation.
6. Define Food Flow presentation.
7. Implement responsive/adaptive presentation.
8. Verify loading, empty, error, disabled and success states that already exist.
9. Verify accessibility and interaction semantics.
10. Run frontend tests/build checks relevant to the changed surface.
11. Update this plan/coverage matrix before moving to the next slice.

No page may be marked complete only because the happy-path screen renders.

## 6. High-level implementation phases

### Phase 0 — Full frontend inventory and dependency map

Goal: establish the complete UI surface and dependency graph before broad implementation. Phase 0 changes documentation only. It must not alter runtime frontend behavior and must never touch backend code.

#### Phase 0 low-level execution design

##### 0.1 Route inventory — `frontend/src/routes`

For every route file and nested route directory:
- record exact repository path
- derive actual URL/path from TanStack routing rather than guessing from filename
- classify surface owner: public, authentication, customer, admin, partner, food-court/operations, or utility
- record parent layout/shell and route guards
- record direct component imports
- record contexts/hooks/query/service dependencies
- record redirects and navigation entry/exit points
- record route params/search params used by presentation
- record visible actions and existing interaction states
- record responsive assumptions/classes present in the route
- record whether the route is a wrapper/delegator or owns substantial UI
- record existing tests that exercise the route or its behavior

Known route families already requiring explicit enumeration include:
- `(auth)` including login, register and forget-password
- public/utility routes including root, about-us and account-deletion
- `admin` and every nested admin route group
- menu/catalog routes
- growth/recommendation routes
- operations/order routes
- promotion/configuration routes
- food-court route entry points
- every additional route returned by the complete route-tree audit

Deliverable: `Route Coverage Matrix` with one row per route file. No route may remain represented only by a high-level category.

##### 0.2 Shared component inventory — `frontend/src/components`

For every component file and nested component directory:
- record exact path and exported component(s)
- classify as primitive, composite, modal/dialog, drawer/sheet, card/list item, navigation, form/control, feedback/state, customer-specific, admin-specific, partner-specific, or shared
- identify every known consumer before redesigning a shared component
- record props that affect visual states
- record callbacks/events whose semantics must remain untouched
- record contexts/hooks/services read directly by the component
- record conditional rendering branches
- record loading/empty/error/disabled/selected/expanded states where present
- record responsive behavior and fixed dimensions
- record accessibility semantics already present or missing
- record whether Food Pop/Food Flow can share structure or require separate composition wrappers

Explicit customer/shared components already identified and requiring individual rows include:
- `BuildYourOwnComboDrawer.jsx`
- `CategoryDishCard.jsx`
- `CategoryTabs.jsx`
- `ComboProgressBanner.jsx`
- `CombosDrawer.jsx`
- `CompleteMealCard.jsx`
- `ConfirmDialog.jsx`
- `CountdownTimer.jsx`
- `CustomerHallPhotoUpload.jsx`
- `CustomerPreOrderDialog.jsx`
- `ErrorBoundary.jsx`
- `HallOfHappinessSection.jsx`
- `LocationSelector.jsx`
- `MenuItemActionButton.jsx`
- `MenuItemCard.jsx`
- `MenuItemEditModal.jsx`
- `MenuItemTagInput.jsx`
- `ModeSwitcher.jsx`
- `OTPVerifyDialog.jsx`
- `OffCanvasCart.jsx`
- `OrderCard.jsx`
- `OrderList.jsx`
- `PartnerRouteGuard.jsx`
- `PartyOrderBanner.jsx`
- `PasswordResetForm.jsx`
- `ProductDetailDialog.jsx`
- `ProductModal.jsx`
- `PromotionCard.jsx`
- `PromotionDrawer.jsx`
- `QuantitySelector.jsx`
- `RecommendedBundleCard.jsx`
- `RetailProductCard.jsx`
- `RoleGuard.jsx`
- `SectionLocationSelector.jsx`
- `SegmentedFilter.jsx`
- `StickyCartBar.jsx`
- `Toast.jsx`
- `UserPartyOrderCard.jsx`

The nested `components/admin` tree must be recursively enumerated with the same detail; examples already observed include `AddonGroupsSection`, `AdminHeader`, `AdminMenuFilters`, `AdminMenuItem`, `AdminSidebar` and all additional files returned by the recursive tree.

Deliverable: `Component Coverage Matrix` with one row per visual component file plus consumer/dependency mapping.

##### 0.3 Feature-module inventory — `frontend/src/features`

Each feature directory must be treated as a mini dependency graph, not a single page.

For `features/food-court`, individually audit:
- `FoodCourtDashboard.jsx`
- `components/CoreSheets.jsx`
- `components/FinanceScreens.jsx`
- `components/FinanceSheets.jsx`
- `components/ManageScreens.jsx`
- `components/OpsScreens.jsx`
- `components/OpsSheets.jsx`
- `components/OverviewScreen.jsx`
- `components/SheetHost.jsx`
- `components/kit.jsx`
- `components/shared.jsx`
- `context.jsx`
- `hooks.js`
- `api.js`
- `format.js`
- `keys.js`

Classification rule:
- screen/sheet/kit/shared visual files: redesign candidates
- context/hooks/api/keys/format behavior: dependency-only unless a presentation-safe import adaptation is unavoidable
- never alter service/API semantics as part of the redesign

Repeat the same recursive audit for any additional feature modules found in the repository.

Deliverable: `Feature Dependency Matrix` linking feature screens to feature UI kit, state, hooks and API dependencies.

##### 0.4 State/context protection map — `frontend/src/context`

The following existing contexts must be explicitly mapped before any consuming UI is redesigned:
- `AdminDashboardContext.jsx`
- `AuthContext.jsx`
- `CartContext.jsx`
- `LocationContext.jsx`
- `PartnerContext.jsx`
- `PreferencesContext.jsx`

For each context:
- list provider location
- list state exposed to UI
- list mutations/actions exposed to UI
- list persistence/storage behavior
- list route/component consumers
- mark semantics as PROTECTED
- document which visual states depend on it

Hard rule: redesign work must not duplicate, replace, reset or reinterpret these state contracts merely to support Food Pop/Food Flow.

Deliverable: `Protected Frontend State Map`.

##### 0.5 Hooks/query/services dependency map

Recursively audit `frontend/src/hooks`, `frontend/src/query` and `frontend/src/services`.

For every file:
- classify as behavior/state/data/service/integration vs presentation helper
- identify route/component consumers
- record query keys/cache assumptions where relevant
- record loading/error data exposed to UI
- record mutations/actions triggered by UI
- mark API/service contracts as PROTECTED
- identify any visual helper that can safely move into the design system without changing behavior

Hard rule: no API endpoint, payload, response mapping, payment/service behavior, query semantics or mutation semantics may be changed for the redesign.

Deliverable: `UI-to-Behavior Dependency Matrix`.

##### 0.6 Global style and brand audit

Audit:
- `frontend/src/index.css`
- `frontend/src/styles/**`
- `frontend/src/assets/**`
- `frontend/src/content/**`
- UI-relevant files under `frontend/src/lib/**`
- root/app shell styling and any Tailwind/configured utility usage relevant to presentation

Extract only repository-backed values for:
- logo/wordmark assets
- brand colors
- typography/font families/weights
- spacing patterns
- radius patterns
- shadows/elevation
- icon treatment
- imagery/illustration treatment
- breakpoints/media queries
- animation/motion conventions
- z-index/overlay conventions
- safe-area/mobile viewport handling

Do not invent missing brand values. Missing or conflicting values become explicit audit findings.

Deliverable: `Brand & Existing Style Baseline` and candidate mapping to shared brand tokens vs Food Pop/Food Flow semantic tokens.

##### 0.7 Application bootstrap and shell audit

Audit `main.jsx`, `router.jsx`, `__root.jsx`, route providers and global error handling.

Document:
- provider nesting/order
- router creation and route-tree integration
- global error boundary/handler behavior
- global toast/overlay hosts
- shell/header/footer/navigation ownership
- authentication/location/preferences initialization dependencies
- any PWA/TWA/browser-specific presentation behavior that affects UI

Hard rule: experience switching must not reorder or recreate protected providers in a way that resets application state.

Deliverable: `Application Shell Dependency Diagram`.

##### 0.8 Interaction-overlay inventory

Create an explicit list of every user-visible overlay independent of route coverage:
- modal
- dialog
- drawer
- off-canvas panel
- bottom sheet/sheet
- toast
- confirmation prompt
- OTP flow
- edit modal
- product detail
- cart
- promotion
- combo builder
- preorder
- Hall of Happiness upload
- admin edit/configuration overlays
- food-court sheets

For each overlay record:
- opener(s)
- close/dismiss behavior
- focus/keyboard behavior
- state owner
- destructive/confirm actions
- mobile vs desktop presentation
- stacking/z-index dependencies

Deliverable: `Overlay & Interaction Matrix`.

##### 0.9 Responsive baseline inventory

For every major route family and shared composite component, capture current behavior at:
- 320px
- 375px
- 411px
- 768px
- 1024px
- 1440px

Record:
- navigation form
- columns/grid/list density
- sticky/fixed elements
- overflow behavior
- modal/drawer behavior
- image sizing/aspect ratios
- touch target concerns
- desktop-specific composition
- mobile-specific composition
- any existing breakpoints that must be preserved or intentionally redesigned

Deliverable: `Responsive Baseline Matrix`.

##### 0.10 Existing frontend test/build coverage map

Audit `frontend/package.json`, frontend test files and CI workflows relevant to frontend.

For each test/check:
- record command
- record surfaces/behavior protected
- identify whether it is unit, integration, presentation, accessibility, build, lint or regression coverage
- map it to affected routes/components
- identify critical UI flows with no current automated protection

No test may be weakened/deleted merely because a redesign makes it inconvenient. Behavior tests are non-regression gates.

Deliverable: `Frontend Regression Gate Matrix`.

##### 0.11 Dependency-based implementation ordering

After 0.1–0.10, calculate implementation order using these rules:
1. shared brand/design primitives before consumers
2. shell/navigation before route compositions that depend on them
3. high-fan-out shared components before duplicate page-level styling
4. protected state/service dependencies are never redesigned
5. overlays are redesigned alongside the first primary flow that exercises them, then regression-tested across other consumers
6. admin shared primitives before admin route families
7. feature-local kits before feature-local screens
8. low-fan-out orphan/special-case surfaces after their shared dependencies
9. gap-closure phase must compare against the inventory, not memory

Deliverable: final dependency-aware work breakdown used to refine Phases 1–12.

##### 0.12 Phase 0 completion gate

Phase 0 reaches VERIFIED only when:
- every route file has a coverage row
- every visual component file has a coverage row
- every feature screen/sheet has a coverage row
- every context/hook/query/service dependency used by visible UI is mapped
- every overlay is mapped
- brand/style baseline is documented from repository evidence
- responsive baseline is captured for all major surface families
- frontend regression gates are mapped
- each surface is assigned to exactly one primary implementation phase
- cross-phase shared dependencies are explicitly listed
- zero backend files changed

Phase 0 implementation status at this refinement step: `IN_PROGRESS`.

### Phase 1 — Design foundation and shared primitives

Goal: create presentation infrastructure without changing behavior.

Scope:
- shared brand token layer sourced from repository assets/styles
- Food Pop semantic visual tokens
- Food Flow semantic visual tokens
- spacing/radius/elevation/typography/motion primitives
- responsive breakpoint primitives
- shell/navigation presentation primitives
- buttons, inputs, cards, chips, tabs, badges, dialogs, drawers, sheets, toasts, skeleton/loading/empty/error patterns where already present
- experience selector if retained as an approved requirement

Rules:
- no business-state duplication
- no service/API changes
- no backend changes

Low-level design: TO BE REFINED AFTER PHASE 0 INVENTORY EVIDENCE IS COMPLETE.

### Phase 2 — Global shell, authentication and public utility pages

Scope determined by repository inventory, including existing surfaces such as:
- root/application shell
- login
- register
- forgot/reset password
- about/public informational pages
- account deletion UI
- global navigation/header/footer elements
- route-level error/fallback UI

Acceptance:
- both visual experiences
- mobile/tablet/desktop responsiveness
- same existing behavior and validation

Low-level design: TO BE REFINED FROM PHASE 0 ROUTE/COMPONENT DEPENDENCY MAP.

### Phase 3 — Customer discovery and menu experience

Scope based strictly on existing repository functionality:
- home/discovery surfaces
- categories/tabs
- location selection if present
- menu listing
- menu item cards
- retail/product cards
- promotional cards/drawers
- product detail dialogs/modals
- quantity controls
- recommendation/bundle/combo presentation already present in repo
- sticky/action bars

Representative existing shared components include `CategoryTabs`, `MenuItemCard`, `RetailProductCard`, `ProductDetailDialog`, `PromotionCard`, `PromotionDrawer`, `QuantitySelector`, `RecommendedBundleCard`, `CompleteMealCard`, `CombosDrawer`, `BuildYourOwnComboDrawer`, and `StickyCartBar`.

Low-level design: TO BE REFINED FROM PHASE 0 CUSTOMER SURFACE MATRIX.

### Phase 4 — Cart and customer transaction presentation

Scope:
- off-canvas cart and related cart UI
- item customization presentation already supported by repo
- existing checkout-related screens/components found during inventory
- confirmation dialogs
- OTP dialogs where currently used
- any existing promotional/offer presentation connected to the transaction flow

Hard rule:
- calculations, business rules and service interactions remain unchanged.

Low-level design: TO BE REFINED FROM PHASE 0 TRANSACTION DEPENDENCY MAP.

### Phase 5 — Orders and customer secondary flows

Scope from current repository, including where present:
- order list/cards/details
- preorder UI
- party-order UI
- Hall of Happiness customer section/upload
- countdown/status components
- profile/settings surfaces discovered in route inventory
- existing account/customer utility flows

Representative shared components already identified include `OrderCard`, `OrderList`, `CustomerPreOrderDialog`, `PartyOrderBanner`, `UserPartyOrderCard`, `HallOfHappinessSection`, `CustomerHallPhotoUpload`, and `CountdownTimer`.

Low-level design: TO BE REFINED FROM PHASE 0 SECONDARY-FLOW MATRIX.

### Phase 6 — Admin shell and shared admin design system

Goal: redesign admin presentation consistently without changing admin behavior.

Scope:
- admin shell
- admin header/sidebar/navigation
- filters
- tables/cards/forms/modals
- location/section selectors
- role-sensitive visual states
- shared admin primitives first, before individual admin pages

Low-level design: TO BE REFINED AFTER RECURSIVE `components/admin` AND ADMIN ROUTE AUDIT.

### Phase 7 — Admin menu, catalog and growth surfaces

Repository-backed scope includes existing routes such as:
- menu
- manage menu
- classification
- global products
- MRP products
- combo campaigns
- home content
- meal roles
- recommendations
- item recommendations
- combo opportunities
- auto suggestions
- cart rules
- coupons and related promotion/configuration surfaces discovered in inventory

Low-level design: TO BE REFINED FROM PHASE 0 ADMIN MENU/GROWTH DEPENDENCY MAP.

### Phase 8 — Admin order and operations surfaces

Repository-backed scope includes existing routes such as:
- kitchen queue
- operational queue
- service board
- pre-orders
- party orders
- Hall of Happiness admin
- manual invoices
- refunds
- milestones
- other operations/order routes found in the complete route inventory

Low-level design: TO BE REFINED FROM PHASE 0 ADMIN OPERATIONS DEPENDENCY MAP.

### Phase 9 — Food-court feature module

The repository contains a dedicated `frontend/src/features/food-court` architecture with dashboard, context, API hooks, formatting and reusable screen/sheet components.

Scope:
- FoodCourtDashboard
- OverviewScreen
- CoreSheets
- FinanceScreens
- FinanceSheets
- ManageScreens
- OpsScreens
- OpsSheets
- SheetHost
- feature kit/shared presentation

Rule:
- API/hooks/context behavior remains untouched unless a presentation-only import adaptation is required.

Low-level design: TO BE REFINED FROM PHASE 0 FEATURE DEPENDENCY MATRIX.

### Phase 10 — Remaining route/component coverage

Goal: close every inventory gap not covered by Phases 2–9.

Tasks:
- compare full route matrix against completed implementation
- compare component matrix against completed implementation
- address orphan pages, dialogs, modals, sheets, special states and role-specific surfaces
- verify no existing visible route or reusable UI component is unintentionally left on an incompatible legacy design

Low-level design: GENERATED FROM THE PHASE 0 GAP REGISTER AND UPDATED THROUGHOUT IMPLEMENTATION.

### Phase 11 — Responsive, accessibility and visual-regression hardening

Required verification widths where applicable:
- 320
- 375
- 411
- 768
- 1024
- 1440

Verify:
- keyboard navigation
- focus management
- touch targets
- safe-area behavior where applicable
- reduced motion
- screen-reader labels
- contrast
- overflow/long text
- empty/loading/error/disabled states
- modal/drawer/sheet behavior
- desktop composition vs mobile composition

Low-level design: TO BE REFINED USING PHASE 0 RESPONSIVE BASELINE + PER-PHASE FINDINGS.

### Phase 12 — Final non-regression and completion audit

Before declaring UI migration complete:
- every existing route is mapped and reviewed
- every reusable visual component is mapped and reviewed
- Food Pop coverage complete where required
- Food Flow coverage complete where required
- existing frontend functionality preserved
- no backend files changed
- frontend build/tests pass
- no dead navigation/actions introduced
- no unsupported functionality invented
- documentation and screenshots/evidence updated

Low-level design: TO BE REFINED AS A FINAL CHECKLIST FROM ALL VERIFIED COVERAGE MATRICES.

## 7. Coverage tracking matrix

Each implementation slice must update a matrix with at least:

| Surface | Route/File | Shared dependencies | Existing behavior captured | Food Pop | Food Flow | Mobile | Tablet | Desktop | States checked | Tests/build | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|

Status values:
- NOT_AUDITED
- AUDITED
- IN_PROGRESS
- IMPLEMENTED
- VERIFIED
- BLOCKED

No surface is considered done until it reaches VERIFIED.

## 8. File classification rules

Before modification, every touched frontend file must be classified:

### Presentation
May be redesigned.
Examples: layout, JSX composition, classes, style props, typography, icons, spacing.

### Shared UI component
May be redesigned, but all consumers must be identified first.

### Frontend behavior/state
Do not change semantics merely for redesign.
Examples: contexts, reducers, hooks, local persistence, navigation state, cart state.

### Service/integration
Do not change contract/behavior for UI work.
Examples: API clients, query functions, payment/service calls.

### Infrastructure/generated
Do not hand-edit unless necessary and understood.
Examples: generated route tree, build config.

## 9. Backend protection rule

This is a hard stop condition:

- No files under backend implementation paths may be modified as part of this UI program.
- If a UI task appears to require backend work, stop that subtask and document the incompatibility instead of changing backend code.
- Existing backend response shapes must be consumed as-is.

## 10. Pull request discipline

Each implementation PR should:
- reference this master plan
- name the phase/surfaces covered
- list routes/components changed
- explicitly state `Backend changes: NONE`
- list preserved functionality
- include responsive/accessibility evidence where relevant
- include frontend test/build evidence
- identify remaining uncovered surfaces

## 11. Source-of-truth rule for future development

For every subsequent implementation request:

1. Read this plan.
2. Inspect the current repository implementation for the target phase.
3. Expand that phase into low-level tasks only from repository evidence.
4. Implement UI changes only.
5. Update coverage/status in this plan or its companion inventory.
6. Do not proceed based on memory, previous assumptions or unrelated product context.

If repository reality conflicts with this plan, repository reality wins and this document must be corrected before implementation continues.
