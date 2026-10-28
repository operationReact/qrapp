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

Goal: establish the complete UI surface before broad implementation.

Tasks:
- enumerate all routes/pages from `frontend/src/routes`
- enumerate reusable components from `frontend/src/components`
- enumerate feature modules from `frontend/src/features`
- map contexts, hooks, queries and services used by each visible surface
- classify each file as presentation, shared UI, frontend behavior/state, service/integration, or infrastructure
- identify customer/admin/partner/operational ownership
- identify modal/drawer/sheet/dialog dependencies
- identify global CSS and current brand tokens/assets
- establish responsive baseline and existing test coverage

Output:
- route/page matrix
- shared component matrix
- dependency matrix
- design coverage matrix
- implementation order by dependency, not arbitrary file order

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

### Phase 10 — Remaining route/component coverage

Goal: close every inventory gap not covered by Phases 2–9.

Tasks:
- compare full route matrix against completed implementation
- compare component matrix against completed implementation
- address orphan pages, dialogs, modals, sheets, special states and role-specific surfaces
- verify no existing visible route or reusable UI component is unintentionally left on an incompatible legacy design

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
