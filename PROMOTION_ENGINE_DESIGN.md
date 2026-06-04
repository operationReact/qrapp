# Promotion Engine — Architecture & Design Document
### qrapp · Senior Staff Engineering Reference

> **Version:** 2.0 — Supersedes `COUPON_ENGINE_DESIGN.md`  
> **Date:** June 4, 2026  
> **Stack:** Spring Boot 3 · PostgreSQL · Redis · React/Vite · TanStack Query · Tailwind CSS  
> **Design Philosophy:** Correct architecture · Clean domain model · Easy extensibility · Fast Phase 1 implementation

---

## Table of Contents

1. [Why Promotion Engine, Not Coupon Engine](#1-why-promotion-engine-not-coupon-engine)
2. [Domain Model](#2-domain-model)
3. [Architecture Diagram](#3-architecture-diagram)
4. [Entity Relationship Diagram](#4-entity-relationship-diagram)
5. [Database Schema (DDL)](#5-database-schema-ddl)
6. [Rule Engine Design](#6-rule-engine-design)
7. [Reward Engine Design](#7-reward-engine-design)
8. [Segmentation Service](#8-segmentation-service)
9. [Stacking Strategy](#9-stacking-strategy)
10. [Recommendation Engine](#10-recommendation-engine)
11. [Eligibility Engine (Full Flow)](#11-eligibility-engine-full-flow)
12. [API Specifications](#12-api-specifications)
13. [Checkout UX Flow](#13-checkout-ux-flow)
14. [Spring Boot Class Structure](#14-spring-boot-class-structure)
15. [Example Promotion Configurations](#15-example-promotion-configurations)
16. [Implementation Roadmap](#16-implementation-roadmap)
17. [Future Enhancements](#17-future-enhancements)

---

## 1. Why Promotion Engine, Not Coupon Engine

The business will support multiple promotion types that share the same eligibility, targeting, and reward logic but differ in how they are triggered and structured:

| Promotion Type | Trigger | Phase |
|---|---|---|
| Coupon Code | User enters code | **Phase 1** |
| Automatic Discount | Applied without code when eligible | **Phase 1** |
| Buy X Get Y | Quantity-based | Phase 2 |
| Combo Offer | Specific item combinations | Phase 2 |
| Happy Hour | Time-window based | Phase 2 |
| Festival Campaign | Date-range campaign | Phase 3 |
| Loyalty Reward | Points/tier based | Phase 4 |
| Personalized Promotion | ML-driven | Phase 5 |

A `Coupon` is **one type of Promotion** — not the root concept. Building the rule, reward, and eligibility engines around `Promotion` means every future type is a configuration change, not a code change.

### Core Insight

```
Old model:  Coupon → (has rules baked in) → applies discount
New model:  Promotion → [Rules] → [Scopes] → [Reward]
                              ↑
                     evaluated by engine
```

---

## 2. Domain Model

### Bounded Context Map

```
┌─────────────────────────────────────────────────────────────────┐
│                     PROMOTION CONTEXT                           │
│                                                                 │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────────┐  │
│  │  Promotion  │───▶│PromotionRule │    │  PromotionScope   │  │
│  │             │    │              │    │                   │  │
│  │ code        │    │ rule_type    │    │ scope_type        │  │
│  │ title       │    │ params(JSONB)│    │ scope_id          │  │
│  │ promo_type  │    └──────────────┘    └───────────────────┘  │
│  │ stack_mode  │                                               │
│  │ is_active   │    ┌──────────────┐    ┌───────────────────┐  │
│  │ starts_at   │───▶│PromotionRewd │    │  PromotionUsage   │  │
│  │ expires_at  │    │              │    │                   │  │
│  └─────────────┘    │ reward_type  │    │ user_id           │  │
│                     │ value        │    │ order_id          │  │
│                     │ max_cap      │    │ discount_amount   │  │
│                     └──────────────┘    └───────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Concept Definitions

| Concept | Responsibility |
|---|---|
| **Promotion** | Root aggregate. Owns identity (code), type, timing, stacking mode, active flag. |
| **PromotionRule** | Defines conditions that must ALL pass for the promotion to be eligible. Each rule has a `rule_type` and a `params` JSONB blob. |
| **PromotionScope** | Restricts promotion to specific restaurants, categories, or menu items. Uses a generic `(scope_type, scope_id)` pair — no new table needed for new scope types. |
| **PromotionReward** | Defines what the user receives when the promotion is applied. Reward type + value + optional cap. |
| **PromotionUsage** | Append-only log of every redemption. Used for usage limit checks and audit. |

---

## 3. Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      CLIENT  (React / Vite)                              │
│                                                                          │
│   CartContext ──▶ useCheckoutPromotions() ──▶ PromotionDrawer            │
│                        (TanStack Query)           (Shadcn Drawer)        │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │  HTTPS / REST
┌───────────────────────────────▼──────────────────────────────────────────┐
│                    PromotionController  (Spring Boot)                    │
│   GET  /api/promotions/checkout-eligible                                 │
│   POST /api/promotions/validate                                          │
│   POST /api/promotions/apply                                             │
└───────┬───────────────────────────────────────────────────┬──────────────┘
        │                                                   │
┌───────▼───────────────────────────────┐   ┌──────────────▼─────────────┐
│         PromotionEligibilityService   │   │  PromotionRedemptionService │
│                                       │   │                             │
│  1. Load active promotions (Redis)    │   │  - validate at order time   │
│  2. Run RuleEngine per promotion      │   │  - write PromotionUsage     │
│  3. Run ScopeFilter                   │   │  - update order totals      │
│  4. Compute reward via RewardEngine   │   └─────────────────────────────┘
│  5. Score + rank                      │
│  6. Return ranked list                │
└──────┬──────────────────┬─────────────┘
       │                  │
┌──────▼──────┐   ┌───────▼────────────────────────────────────────────┐
│    Redis    │   │  RuleEngine (Chain of Responsibility)               │
│             │   │                                                     │
│  promotion  │   │  ActiveStatusRule → DateRangeRule →                 │
│  :meta:{id} │   │  MinOrderAmountRule → UsageLimitRule →              │
│             │   │  PerUserLimitRule → FirstOrderOnlyRule →            │
│  promotion  │   │  SegmentRule (via SegmentationService)              │
│  :usage:{id}│   └────────────────────────────────────────────────────┘
│             │
│  promo      │   ┌────────────────────────────────────────────────────┐
│  :user:{uid}│   │  RewardEngine (Strategy Pattern)                   │
│  :cart:{h}  │   │                                                     │
└─────────────┘   │  PercentageDiscountStrategy                        │
                  │  FlatDiscountStrategy                               │
                  │  FreeDeliveryStrategy                               │
                  └────────────────────────────────────────────────────┘
        │
┌───────▼────────────────────────────────────────────────────────────────┐
│                          PostgreSQL                                    │
│                                                                        │
│  promotion · promotion_rule · promotion_scope · promotion_reward       │
│  promotion_usage · users (altered)                                     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Entity Relationship Diagram

```
promotion
─────────
id (PK)
code (UNIQUE, nullable — null = automatic discount)
title
description
promo_type          ─── [COUPON_CODE, AUTOMATIC_DISCOUNT, ...]
stack_mode          ─── [NONE, DELIVERY_ONLY, MULTIPLE_ALLOWED]
is_active
is_first_order_only
starts_at
expires_at
total_usage_limit
per_user_limit
created_by
created_at / updated_at
        │
        │ 1:N
        ▼
promotion_rule
──────────────
id (PK)
promotion_id (FK → promotion.id)
rule_type           ─── [MIN_ORDER_AMOUNT, DATE_RANGE, ...]
params              ─── JSONB  e.g. {"minAmount": 299}
        │
        │ (evaluated by RuleEngine)

        │ 1:N
        ▼
promotion_scope
───────────────
id (PK)
promotion_id (FK → promotion.id)
scope_type          ─── [RESTAURANT, CATEGORY, MENU_ITEM]
scope_id            ─── FK value (restaurant.id / category.id / menu_item.id)

        │ 1:1
        ▼
promotion_reward
────────────────
id (PK)
promotion_id (FK → promotion.id, UNIQUE — one reward per promotion)
reward_type         ─── [PERCENTAGE_DISCOUNT, FLAT_DISCOUNT, FREE_DELIVERY]
value               ─── NUMERIC (percentage or flat amount)
max_cap             ─── NUMERIC (nullable — cap for percentage discounts)

        │ 1:N
        ▼
promotion_usage
───────────────
id (PK)
promotion_id (FK → promotion.id)
user_id      (FK → users.id)
order_id     (FK → orders.id)
discount_amount
redeemed_at

users (altered)
───────────────
id
...existing fields...
order_count    ← NEW (maintained via trigger or service)
last_order_at  ← NEW
```

---

## 5. Database Schema (DDL)

```sql
-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE promo_type AS ENUM (
    'COUPON_CODE',
    'AUTOMATIC_DISCOUNT'
    -- Future: 'BUY_X_GET_Y', 'COMBO', 'HAPPY_HOUR', 'LOYALTY_REWARD'
);

CREATE TYPE promo_stack_mode AS ENUM (
    'NONE',           -- cannot stack with any other promotion
    'DELIVERY_ONLY',  -- can stack only with a FREE_DELIVERY promotion
    'MULTIPLE_ALLOWED'-- can stack freely
);

CREATE TYPE promo_rule_type AS ENUM (
    'MIN_ORDER_AMOUNT',
    'FIRST_ORDER_ONLY',
    'DATE_RANGE',
    'TOTAL_USAGE_LIMIT',
    'PER_USER_LIMIT',
    'ACTIVE_STATUS'
    -- Scope-based rules (RESTAURANT_MATCH, CATEGORY_MATCH, MENU_ITEM_MATCH)
    -- are enforced via promotion_scope table, not as rules
);

CREATE TYPE promo_scope_type AS ENUM (
    'RESTAURANT',
    'CATEGORY',
    'MENU_ITEM'
    -- Future: 'BRAND', 'CUISINE', 'COLLECTION', 'VENDOR'
    -- Adding a new scope type = ALTER TYPE only, no table change
);

CREATE TYPE promo_reward_type AS ENUM (
    'PERCENTAGE_DISCOUNT',
    'FLAT_DISCOUNT',
    'FREE_DELIVERY'
    -- Future: 'BUY_X_GET_Y', 'FREE_ITEM', 'COMBO_DISCOUNT'
);

-- ============================================================
-- TABLE: promotion
-- ============================================================
CREATE TABLE promotion (
    id                  BIGSERIAL       PRIMARY KEY,
    code                VARCHAR(50)     UNIQUE,             -- NULL for automatic discounts
    title               VARCHAR(100)    NOT NULL,
    description         VARCHAR(500),
    promo_type          promo_type      NOT NULL            DEFAULT 'COUPON_CODE',
    stack_mode          promo_stack_mode NOT NULL           DEFAULT 'NONE',
    is_active           BOOLEAN         NOT NULL            DEFAULT TRUE,
    is_first_order_only BOOLEAN         NOT NULL            DEFAULT FALSE,
    starts_at           TIMESTAMP,
    expires_at          TIMESTAMP,
    total_usage_limit   INTEGER,                            -- NULL = unlimited
    per_user_limit      INTEGER,                            -- NULL = unlimited
    created_by          VARCHAR(100),
    updated_by          VARCHAR(100),
    created_at          TIMESTAMP       NOT NULL            DEFAULT NOW(),
    updated_at          TIMESTAMP       NOT NULL            DEFAULT NOW()
);

CREATE INDEX idx_promotion_is_active   ON promotion(is_active);
CREATE INDEX idx_promotion_code        ON promotion(code) WHERE code IS NOT NULL;
CREATE INDEX idx_promotion_expires_at  ON promotion(expires_at);
CREATE INDEX idx_promotion_promo_type  ON promotion(promo_type);

-- ============================================================
-- TABLE: promotion_rule
-- Each row = one rule that must pass for the promotion to be eligible.
-- All rules are AND-ed together.
--
-- params JSONB examples:
--   MIN_ORDER_AMOUNT  → {"minAmount": 299}
--   DATE_RANGE        → {"startsAt": "2026-06-01T00:00:00", "endsAt": "2026-06-30T23:59:59"}
--   TOTAL_USAGE_LIMIT → {"limit": 500}   (can also use promotion.total_usage_limit)
-- ============================================================
CREATE TABLE promotion_rule (
    id           BIGSERIAL       PRIMARY KEY,
    promotion_id BIGINT          NOT NULL REFERENCES promotion(id) ON DELETE CASCADE,
    rule_type    promo_rule_type NOT NULL,
    params       JSONB           NOT NULL DEFAULT '{}',
    created_at   TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_promo_rule_promotion ON promotion_rule(promotion_id);

-- ============================================================
-- TABLE: promotion_scope
--
-- Generic targeting table. Adding new scope types (BRAND, CUISINE)
-- requires only an ALTER TYPE on promo_scope_type — zero table changes.
--
-- Empty scope set = promotion applies to ALL (no restriction).
-- Non-empty scope set = cart must contain at least one matching scope item.
-- ============================================================
CREATE TABLE promotion_scope (
    id           BIGSERIAL       PRIMARY KEY,
    promotion_id BIGINT          NOT NULL REFERENCES promotion(id) ON DELETE CASCADE,
    scope_type   promo_scope_type NOT NULL,
    scope_id     BIGINT          NOT NULL    -- FK enforced at application layer for flexibility
);

CREATE INDEX idx_promo_scope_promotion  ON promotion_scope(promotion_id);
CREATE INDEX idx_promo_scope_type_id    ON promotion_scope(scope_type, scope_id);

-- ============================================================
-- TABLE: promotion_reward
-- One reward per promotion (1:1).
-- ============================================================
CREATE TABLE promotion_reward (
    id           BIGSERIAL        PRIMARY KEY,
    promotion_id BIGINT           NOT NULL UNIQUE REFERENCES promotion(id) ON DELETE CASCADE,
    reward_type  promo_reward_type NOT NULL,
    value        NUMERIC(10, 2)   NOT NULL,  -- % for PERCENTAGE, ₹ for FLAT, ignored for FREE_DELIVERY
    max_cap      NUMERIC(10, 2),             -- max discount cap for PERCENTAGE type; NULL = no cap
    created_at   TIMESTAMP        NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP        NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: promotion_usage
-- Append-only audit log of every redemption.
-- Used for: usage limit checks, fraud detection, analytics.
-- ============================================================
CREATE TABLE promotion_usage (
    id               BIGSERIAL      PRIMARY KEY,
    promotion_id     BIGINT         NOT NULL REFERENCES promotion(id),
    user_id          BIGINT         NOT NULL REFERENCES users(id),
    order_id         BIGINT         NOT NULL REFERENCES orders(id),
    promotion_code   VARCHAR(50),              -- denormalized for analytics queries
    discount_amount  NUMERIC(10, 2) NOT NULL,
    order_subtotal   NUMERIC(10, 2) NOT NULL,
    redeemed_at      TIMESTAMP      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_promo_usage_promotion   ON promotion_usage(promotion_id);
CREATE INDEX idx_promo_usage_user        ON promotion_usage(user_id);
CREATE INDEX idx_promo_usage_promo_user  ON promotion_usage(promotion_id, user_id);
CREATE INDEX idx_promo_usage_redeemed_at ON promotion_usage(redeemed_at);

-- ============================================================
-- ALTER TABLE: users — add fields needed for segmentation
-- ============================================================
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS order_count   INTEGER   NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_order_at TIMESTAMP;

-- Automatically maintain order_count when a new order is placed
-- (handled in OrderService.placeOrder — increment user.orderCount)

-- ============================================================
-- MIGRATION: Preserve existing coupon data
-- Map existing coupon → promotion + promotion_rule + promotion_reward
-- Run this ONCE after schema creation.
-- ============================================================
-- See Section 16 (Implementation Roadmap) for migration script details.
```

---

## 6. Rule Engine Design

### 6.1 Design Pattern: Chain of Responsibility

Each rule is an independent, stateless unit. The engine evaluates them in **cheapest-to-most-expensive order** and short-circuits on the first failure.

```
RuleChain evaluation order:
  1. ACTIVE_STATUS        ← in-memory, free
  2. DATE_RANGE           ← in-memory, free
  3. MIN_ORDER_AMOUNT     ← in-memory arithmetic
  4. FIRST_ORDER_ONLY     ← uses cached user.orderCount
  5. PER_USER_LIMIT       ← Redis counter (batched with #6)
  6. TOTAL_USAGE_LIMIT    ← Redis counter (batched with #5)
  [Scope checks are run separately before rules, via ScopeFilter]
```

### 6.2 Java Interfaces

```java
// ── Core interfaces ────────────────────────────────────────────────────

public interface PromotionRule {
    boolean supports(RuleType ruleType);
    RuleResult evaluate(EligibilityContext ctx, Promotion promotion, JsonNode params);
}

public record RuleResult(
    boolean passed,
    String  failureReason,    // human-readable, shown in UI
    BigDecimal missingAmount  // non-null for MIN_ORDER_AMOUNT failures only
) {
    public static RuleResult pass() {
        return new RuleResult(true, null, null);
    }
    public static RuleResult fail(String reason) {
        return new RuleResult(false, reason, null);
    }
    public static RuleResult failWithGap(String reason, BigDecimal gap) {
        return new RuleResult(false, reason, gap);
    }
}

public record EligibilityContext(
    UserContext  user,
    CartContext  cart,
    LocalDateTime evaluatedAt
) {}

public record UserContext(
    Long          id,
    int           orderCount,
    LocalDateTime lastOrderAt   // null if no orders yet
) {}

public record CartContext(
    Long            restaurantId,
    BigDecimal      subtotal,
    BigDecimal      deliveryFee,
    List<CartItem>  items       // {menuItemId, categoryId, quantity, unitPrice}
) {}
```

### 6.3 Rule Implementations

```java
// ── 1. Active Status ──────────────────────────────────────────────────
@Component
public class ActiveStatusRule implements PromotionRule {

    @Override
    public boolean supports(RuleType type) { return type == RuleType.ACTIVE_STATUS; }

    @Override
    public RuleResult evaluate(EligibilityContext ctx, Promotion p, JsonNode params) {
        return p.isActive()
            ? RuleResult.pass()
            : RuleResult.fail("This promotion is no longer active");
    }
}

// ── 2. Date Range ─────────────────────────────────────────────────────
@Component
public class DateRangeRule implements PromotionRule {

    @Override
    public boolean supports(RuleType type) { return type == RuleType.DATE_RANGE; }

    @Override
    public RuleResult evaluate(EligibilityContext ctx, Promotion p, JsonNode params) {
        LocalDateTime now = ctx.evaluatedAt();
        if (p.getStartsAt() != null && now.isBefore(p.getStartsAt()))
            return RuleResult.fail("This promotion is not yet active");
        if (p.getExpiresAt() != null && now.isAfter(p.getExpiresAt()))
            return RuleResult.fail("This promotion has expired");
        return RuleResult.pass();
    }
}

// ── 3. Minimum Order Amount ───────────────────────────────────────────
@Component
public class MinOrderAmountRule implements PromotionRule {

    @Override
    public boolean supports(RuleType type) { return type == RuleType.MIN_ORDER_AMOUNT; }

    @Override
    public RuleResult evaluate(EligibilityContext ctx, Promotion p, JsonNode params) {
        BigDecimal minAmount = params.get("minAmount").decimalValue();
        BigDecimal subtotal  = ctx.cart().subtotal();
        if (subtotal.compareTo(minAmount) < 0) {
            BigDecimal gap = minAmount.subtract(subtotal).setScale(2, RoundingMode.CEILING);
            return RuleResult.failWithGap(
                "Add ₹" + gap + " more to unlock this offer", gap
            );
        }
        return RuleResult.pass();
    }
}

// ── 4. First Order Only ───────────────────────────────────────────────
@Component
public class FirstOrderOnlyRule implements PromotionRule {

    @Override
    public boolean supports(RuleType type) { return type == RuleType.FIRST_ORDER_ONLY; }

    @Override
    public RuleResult evaluate(EligibilityContext ctx, Promotion p, JsonNode params) {
        if (!p.isFirstOrderOnly()) return RuleResult.pass();
        return ctx.user().orderCount() == 0
            ? RuleResult.pass()
            : RuleResult.fail("This offer is for first-time orders only");
    }
}

// ── 5. Per-User Usage Limit ───────────────────────────────────────────
@Component
public class PerUserLimitRule implements PromotionRule {

    private final PromotionUsageRepository usageRepo;

    @Override
    public boolean supports(RuleType type) { return type == RuleType.PER_USER_LIMIT; }

    @Override
    public RuleResult evaluate(EligibilityContext ctx, Promotion p, JsonNode params) {
        if (p.getPerUserLimit() == null) return RuleResult.pass();
        long used = usageRepo.countByPromotionIdAndUserId(p.getId(), ctx.user().id());
        return used < p.getPerUserLimit()
            ? RuleResult.pass()
            : RuleResult.fail("You've already used this promotion the maximum number of times");
    }
}

// ── 6. Total Usage Limit ──────────────────────────────────────────────
@Component
public class TotalUsageLimitRule implements PromotionRule {

    private final PromotionUsageRepository usageRepo;

    @Override
    public boolean supports(RuleType type) { return type == RuleType.TOTAL_USAGE_LIMIT; }

    @Override
    public RuleResult evaluate(EligibilityContext ctx, Promotion p, JsonNode params) {
        if (p.getTotalUsageLimit() == null) return RuleResult.pass();
        long used = usageRepo.countByPromotionId(p.getId());
        return used < p.getTotalUsageLimit()
            ? RuleResult.pass()
            : RuleResult.fail("This promotion has reached its usage limit");
    }
}
```

### 6.4 Rule Engine Orchestrator

```java
@Service
public class PromotionRuleEngine {

    private final List<PromotionRule> rules;
    private final PromotionScopeFilter scopeFilter;

    public PromotionRuleEngine(List<PromotionRule> rules, PromotionScopeFilter scopeFilter) {
        this.rules       = rules;
        this.scopeFilter = scopeFilter;
    }

    public EligibilityResult evaluate(EligibilityContext ctx, Promotion promotion) {

        // Step 1: Scope check (is this promotion relevant to this cart?)
        ScopeResult scopeResult = scopeFilter.check(ctx.cart(), promotion.getScopes());
        if (!scopeResult.matches()) {
            return EligibilityResult.ineligible(promotion, scopeResult.reason());
        }

        // Step 2: Run all promotion_rules in order (short-circuit on first failure)
        for (PromotionRuleEntity ruleEntity : promotion.getRules()) {
            PromotionRule handler = rules.stream()
                .filter(r -> r.supports(ruleEntity.getRuleType()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                    "No handler for rule: " + ruleEntity.getRuleType()));

            RuleResult result = handler.evaluate(ctx, promotion, ruleEntity.getParams());
            if (!result.passed()) {
                return EligibilityResult.ineligible(promotion, result.failureReason(), result.missingAmount());
            }
        }

        // Step 3: Compute reward amount
        BigDecimal discount = rewardEngine.compute(promotion.getReward(), ctx.cart());
        return EligibilityResult.eligible(promotion, discount);
    }
}
```

### 6.5 Scope Filter

```java
@Component
public class PromotionScopeFilter {

    /**
     * An empty scope list means the promotion applies to ALL carts.
     * A non-empty scope list means the cart must contain at least one
     * item that matches any of the scopes (OR logic within a scope_type,
     * AND logic across scope_types if multiple scope_types present).
     */
    public ScopeResult check(CartContext cart, List<PromotionScope> scopes) {
        if (scopes == null || scopes.isEmpty()) return ScopeResult.match();

        // Group by scope_type
        Map<ScopeType, Set<Long>> scopeMap = scopes.stream()
            .collect(Collectors.groupingBy(
                PromotionScope::getScopeType,
                Collectors.mapping(PromotionScope::getScopeId, Collectors.toSet())
            ));

        // For each scope_type group, at least one cart item must match
        for (Map.Entry<ScopeType, Set<Long>> entry : scopeMap.entrySet()) {
            boolean anyMatch = switch (entry.getKey()) {
                case RESTAURANT -> entry.getValue().contains(cart.restaurantId());
                case CATEGORY   -> cart.items().stream()
                                        .anyMatch(i -> entry.getValue().contains(i.categoryId()));
                case MENU_ITEM  -> cart.items().stream()
                                        .anyMatch(i -> entry.getValue().contains(i.menuItemId()));
            };
            if (!anyMatch) {
                String reason = switch (entry.getKey()) {
                    case RESTAURANT -> "This promotion is valid only at specific restaurants";
                    case CATEGORY   -> "Add an item from the required category to use this promotion";
                    case MENU_ITEM  -> "Add the required item to your cart to use this promotion";
                };
                return ScopeResult.noMatch(reason);
            }
        }
        return ScopeResult.match();
    }
}
```

---

## 7. Reward Engine Design

### 7.1 Strategy Pattern

```java
// ── Interface ─────────────────────────────────────────────────────────
public interface RewardStrategy {
    RewardType getType();
    BigDecimal compute(PromotionReward reward, CartContext cart);
    String describe(PromotionReward reward);  // e.g. "20% off" — shown in UI
}

// ── Registry ──────────────────────────────────────────────────────────
@Service
public class RewardEngine {
    private final Map<RewardType, RewardStrategy> strategies;

    public RewardEngine(List<RewardStrategy> strategyList) {
        this.strategies = strategyList.stream()
            .collect(Collectors.toMap(RewardStrategy::getType, Function.identity()));
    }

    public BigDecimal compute(PromotionReward reward, CartContext cart) {
        return strategies.get(reward.getRewardType()).compute(reward, cart);
    }
}
```

### 7.2 Reward Implementations (Phase 1)

```java
// ── PERCENTAGE_DISCOUNT ───────────────────────────────────────────────
@Component
public class PercentageDiscountStrategy implements RewardStrategy {

    @Override
    public RewardType getType() { return RewardType.PERCENTAGE_DISCOUNT; }

    @Override
    public BigDecimal compute(PromotionReward reward, CartContext cart) {
        // value = percentage (e.g. 20 = 20%)
        BigDecimal raw = cart.subtotal()
            .multiply(reward.getValue())
            .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        // Apply cap if configured
        if (reward.getMaxCap() != null) {
            raw = raw.min(reward.getMaxCap());
        }
        return raw;
    }

    @Override
    public String describe(PromotionReward reward) {
        String base = reward.getValue().stripTrailingZeros().toPlainString() + "% off";
        if (reward.getMaxCap() != null)
            base += " (up to ₹" + reward.getMaxCap().toPlainString() + ")";
        return base;
    }
}

// ── FLAT_DISCOUNT ─────────────────────────────────────────────────────
@Component
public class FlatDiscountStrategy implements RewardStrategy {

    @Override
    public RewardType getType() { return RewardType.FLAT_DISCOUNT; }

    @Override
    public BigDecimal compute(PromotionReward reward, CartContext cart) {
        // Flat discount cannot exceed the cart subtotal
        return reward.getValue().min(cart.subtotal());
    }

    @Override
    public String describe(PromotionReward reward) {
        return "₹" + reward.getValue().toPlainString() + " off";
    }
}

// ── FREE_DELIVERY ─────────────────────────────────────────────────────
@Component
public class FreeDeliveryStrategy implements RewardStrategy {

    @Override
    public RewardType getType() { return RewardType.FREE_DELIVERY; }

    @Override
    public BigDecimal compute(PromotionReward reward, CartContext cart) {
        return cart.deliveryFee();  // entire delivery fee is waived
    }

    @Override
    public String describe(PromotionReward reward) {
        return "Free delivery";
    }
}
```

### 7.3 Future Reward Types (Phase 2+)

To add `BUY_X_GET_Y`:
1. Add `'BUY_X_GET_Y'` to `promo_reward_type` enum
2. Implement `BuyXGetYStrategy implements RewardStrategy`
3. Register it — Spring auto-discovers via `@Component`
4. Store `params` in `promotion_reward.max_cap` or a JSONB column

**Zero changes** to existing rules, scopes, or engine orchestration.

---

## 8. Segmentation Service

> No `user_segments` table in Phase 1. Segments are **computed dynamically** from `users.order_count` and `users.last_order_at`.

### 8.1 Computed Segments

```java
public enum UserSegment {
    NEW_USER,           // orderCount == 0
    RETURNING_USER,     // orderCount between 1 and 9
    LOYAL_CUSTOMER,     // orderCount >= 10
    INACTIVE_USER,      // lastOrderAt > 30 days ago (and has placed orders before)
    FIRST_ORDER         // alias for NEW_USER — used in promotion rule display
}
```

### 8.2 SegmentationService

```java
@Service
public class SegmentationService {

    public UserSegment classify(UserContext user) {
        int count = user.orderCount();

        if (count == 0) return UserSegment.NEW_USER;

        if (user.lastOrderAt() != null) {
            long daysSinceLastOrder = ChronoUnit.DAYS.between(
                user.lastOrderAt(), LocalDateTime.now()
            );
            if (daysSinceLastOrder > 30) return UserSegment.INACTIVE_USER;
        }

        if (count >= 10) return UserSegment.LOYAL_CUSTOMER;
        return UserSegment.RETURNING_USER;
    }

    /**
     * Returns all segments a user belongs to.
     * Used when a promotion allows multiple target segments.
     */
    public Set<UserSegment> getSegments(UserContext user) {
        Set<UserSegment> segments = new HashSet<>();
        segments.add(classify(user));     // primary segment

        // Cross-cutting segments
        if (user.orderCount() == 0)       segments.add(UserSegment.FIRST_ORDER);
        if (user.orderCount() >= 10)      segments.add(UserSegment.LOYAL_CUSTOMER);

        return segments;
    }
}
```

### 8.3 Integration with Rule Engine

The `FirstOrderOnlyRule` already uses `user.orderCount() == 0` directly.  
For future segment-based rules (Phase 2), add a `USER_SEGMENT` rule type:

```java
// Future Phase 2 addition — no breaking changes
// promotion_rule: { rule_type: "USER_SEGMENT", params: {"segments": ["LOYAL_CUSTOMER"]} }

public class UserSegmentRule implements PromotionRule {
    private final SegmentationService segmentationService;

    public RuleResult evaluate(EligibilityContext ctx, Promotion p, JsonNode params) {
        Set<String> allowed = StreamSupport.stream(params.get("segments").spliterator(), false)
            .map(JsonNode::asText).collect(Collectors.toSet());
        Set<String> userSegments = segmentationService.getSegments(ctx.user())
            .stream().map(Enum::name).collect(Collectors.toSet());
        boolean matches = !Collections.disjoint(allowed, userSegments);
        return matches
            ? RuleResult.pass()
            : RuleResult.fail("This promotion is not available for your account type");
    }
}
```

---

## 9. Stacking Strategy

### 9.1 Stack Mode Definitions

| `stack_mode` | Meaning |
|---|---|
| `NONE` | Cannot be combined with any other promotion. If applied, blocks all others. |
| `DELIVERY_ONLY` | Can be stacked with exactly one `FREE_DELIVERY` promotion (and nothing else). |
| `MULTIPLE_ALLOWED` | Can stack freely with other `MULTIPLE_ALLOWED` promotions. |

### 9.2 Stacking Validation Flow

```
When user selects or auto-applies promotions at checkout:

  IF no promotions applied yet:
    → apply first promotion freely

  IF one promotion already applied (P1) AND user selects P2:

    CASE P1.stackMode = NONE:
      → block P2. Message: "Remove current offer before applying another."

    CASE P1.stackMode = DELIVERY_ONLY:
      IF P2.reward.rewardType = FREE_DELIVERY:
        → allow (e.g. 20% OFF + FREE_DELIVERY)
      ELSE:
        → block P2. Message: "This offer can only stack with free delivery."

    CASE P1.stackMode = MULTIPLE_ALLOWED:
      IF P2.stackMode = MULTIPLE_ALLOWED:
        → allow
      ELSE:
        → block P2. Message: "'{P2.title}' cannot be combined with other offers."
```

### 9.3 Java Implementation

```java
@Service
public class StackingValidator {

    public StackingResult canStack(List<Promotion> alreadyApplied, Promotion candidate) {
        if (alreadyApplied.isEmpty()) return StackingResult.allowed();

        for (Promotion applied : alreadyApplied) {
            switch (applied.getStackMode()) {

                case NONE -> {
                    return StackingResult.blocked(
                        "Remove \"" + applied.getTitle() + "\" before applying another offer"
                    );
                }
                case DELIVERY_ONLY -> {
                    boolean candidateIsFreeDelivery =
                        candidate.getReward().getRewardType() == RewardType.FREE_DELIVERY;
                    if (!candidateIsFreeDelivery)
                        return StackingResult.blocked(
                            "\"" + applied.getTitle() + "\" can only stack with free delivery"
                        );
                }
                case MULTIPLE_ALLOWED -> {
                    if (candidate.getStackMode() != StackMode.MULTIPLE_ALLOWED)
                        return StackingResult.blocked(
                            "\"" + candidate.getTitle() + "\" cannot be combined with other offers"
                        );
                }
            }
        }
        return StackingResult.allowed();
    }
}
```

---

## 10. Recommendation Engine

### 10.1 Phase 1 Scoring — Intentionally Simple

```
score = actualDiscountValue + urgencyBonus

Where:
  actualDiscountValue = computed reward amount in ₹ (e.g. ₹120)
  urgencyBonus        = 20  if expiresAt <= now + 24 hours
                      = 10  if expiresAt <= now + 72 hours
                      =  0  otherwise (or no expiry)
```

**Primary factor: actual savings in ₹.** A coupon that saves ₹120 always ranks above one that saves ₹80, regardless of other factors. Urgency only distinguishes ties.

```java
@Service
public class PromotionScoringService {

    public double score(EligiblePromotion eligible) {
        double base    = eligible.actualDiscount().doubleValue();
        double urgency = computeUrgencyBonus(eligible.promotion().getExpiresAt());
        return base + urgency;
    }

    private double computeUrgencyBonus(LocalDateTime expiresAt) {
        if (expiresAt == null) return 0;
        long hoursLeft = ChronoUnit.HOURS.between(LocalDateTime.now(), expiresAt);
        if (hoursLeft <= 24)  return 20;
        if (hoursLeft <= 72)  return 10;
        return 0;
    }
}
```

### 10.2 Auto-Select Logic

```
autoSelected = eligible promotions sorted by score descending → first entry

If the user has already manually selected a promotion in this session:
  → preserve user's choice (stored in CartContext / frontend state)
  → do not override
```

### 10.3 Tie-Breaking (same score)

1. `FREE_DELIVERY` wins over equivalent flat value — perceived value is higher
2. More specific scope (MENU_ITEM > CATEGORY > RESTAURANT > global) ranks first
3. Earlier `expires_at` ranks higher (more urgent)
4. Lower `id` (stable, deterministic sort)

---

## 11. Eligibility Engine (Full Flow)

### 11.1 Input / Output Contract

**Request:**
```java
public record CheckoutPromotionsRequest(
    Long            restaurantId,
    BigDecimal      subtotal,
    BigDecimal      deliveryFee,
    List<CartItem>  items        // {menuItemId, categoryId, quantity, unitPrice}
) {}
```

**Response:**
```java
public record CheckoutPromotionsResponse(
    List<EligiblePromotionDto>   eligiblePromotions,
    List<IneligiblePromotionDto> ineligiblePromotions,
    EligiblePromotionDto         recommendedPromotion,  // auto-selected (top scorer)
    int                          totalEligibleCount
) {}

public record EligiblePromotionDto(
    Long         id,
    String       code,          // null for automatic discounts
    String       title,
    String       description,
    String       rewardType,
    String       rewardDisplay, // e.g. "20% off (up to ₹100)"
    BigDecimal   actualDiscount,
    double       score,
    boolean      isAutoSelected,
    LocalDateTime expiresAt
) {}

public record IneligiblePromotionDto(
    Long       id,
    String     code,
    String     title,
    String     rewardDisplay,
    String     failureReason,   // human-readable
    BigDecimal missingAmount    // non-null for "add ₹X more" cases
) {}
```

### 11.2 Eligibility Engine Pseudocode

```
FUNCTION getCheckoutPromotions(userId, request):

  ── 1. BUILD CONTEXT ─────────────────────────────────────────────
  user = userRepository.findById(userId)          // load order_count, last_order_at
  ctx  = EligibilityContext(
           UserContext(user.id, user.orderCount, user.lastOrderAt),
           CartContext(request.restaurantId, request.subtotal,
                       request.deliveryFee, request.items),
           LocalDateTime.now()
         )

  ── 2. LOAD CANDIDATE PROMOTIONS ─────────────────────────────────
  // Pre-filter in SQL: active + date window + min_order_amount check
  // Keeps evaluation set small before running rule chain
  candidates = promotionRepository.findCandidates(
      isActive   = true,
      now        = ctx.evaluatedAt,
      subtotal   = request.subtotal    // used for soft pre-filter only
  )
  // Query:
  // SELECT p.* FROM promotion p
  // WHERE p.is_active = true
  //   AND (p.starts_at IS NULL OR p.starts_at <= :now)
  //   AND (p.expires_at IS NULL OR p.expires_at >= :now)
  // ORDER BY p.id

  ── 3. EVALUATE EACH CANDIDATE ───────────────────────────────────
  eligible   = []
  ineligible = []

  FOR EACH promotion IN candidates:
      result = ruleEngine.evaluate(ctx, promotion)
      IF result.eligible:
          score = scoringService.score(result)
          eligible.add(EligiblePromotion(promotion, result.discount, score))
      ELSE:
          ineligible.add(IneligiblePromotion(promotion, result.reason, result.missingAmount))

  ── 4. SORT + AUTO-SELECT ─────────────────────────────────────────
  eligible.sortByDescending(score).thenByTieBreakRules()
  IF eligible is not empty:
      eligible[0].isAutoSelected = true

  ── 5. CACHE RESULT ───────────────────────────────────────────────
  redis.set(
      key   = "promo:checkout:u:{userId}:c:{cartHash(request)}",
      value = response,
      ttl   = 5 minutes
  )

  ── 6. RETURN ─────────────────────────────────────────────────────
  RETURN CheckoutPromotionsResponse(
      eligible,
      ineligible,
      eligible[0] or null,
      eligible.size()
  )
```

### 11.3 Apply Promotion (at Order Placement)

```
FUNCTION applyPromotion(orderId, promotionCode, userId, cartSubtotal, deliveryFee, items):

  // Always re-validate server-side — never trust frontend discount values
  promotion = promotionRepository.findByCode(promotionCode)
  IF null → throw PromotionNotFoundException

  ctx    = buildContext(userId, CartContext(subtotal, deliveryFee, items))
  result = ruleEngine.evaluate(ctx, promotion)
  IF !result.eligible → throw PromotionIneligibleException(result.reason)

  // Check stacking
  appliedPromotions = orderPromotionRepository.findByOrderId(orderId)
  stackResult = stackingValidator.canStack(appliedPromotions, promotion)
  IF !stackResult.allowed → throw PromotionStackingException(stackResult.reason)

  // Compute final discount
  discount = rewardEngine.compute(promotion.getReward(), ctx.cart())

  // Persist usage
  promotionUsageRepository.save(PromotionUsage(promotion, user, order, discount))

  // Update order totals
  orderService.applyDiscount(orderId, discount, promotion.getId())

  RETURN ApplyPromotionResponse(promotionCode, discount, finalAmount)
```

---

## 12. API Specifications

### `GET /api/promotions/checkout-eligible`

Fetch ranked eligible and ineligible promotions for the current cart.

**Request Body:**
```json
{
  "restaurantId": 3,
  "subtotal": 499.00,
  "deliveryFee": 40.00,
  "items": [
    { "menuItemId": 101, "categoryId": 5, "quantity": 2, "unitPrice": 150.00 },
    { "menuItemId": 204, "categoryId": 8, "quantity": 1, "unitPrice": 199.00 }
  ]
}
```

**Response 200:**
```json
{
  "eligiblePromotions": [
    {
      "id": 12,
      "code": "SAVE120",
      "title": "Save ₹120",
      "description": "Flat ₹120 off on orders above ₹499",
      "rewardType": "FLAT_DISCOUNT",
      "rewardDisplay": "₹120 off",
      "actualDiscount": 120.00,
      "score": 120.0,
      "isAutoSelected": true,
      "expiresAt": null
    },
    {
      "id": 9,
      "code": "FREEDEL",
      "title": "Free Delivery",
      "description": "Free delivery on all orders",
      "rewardType": "FREE_DELIVERY",
      "rewardDisplay": "Free delivery",
      "actualDiscount": 40.00,
      "score": 40.0,
      "isAutoSelected": false,
      "expiresAt": null
    },
    {
      "id": 15,
      "code": "BIRYANI20",
      "title": "20% off on Biryani",
      "description": "20% off when you order Biryani",
      "rewardType": "PERCENTAGE_DISCOUNT",
      "rewardDisplay": "20% off (up to ₹100)",
      "actualDiscount": 99.80,
      "score": 129.80,
      "isAutoSelected": false,
      "expiresAt": "2026-06-05T23:59:00"
    }
  ],
  "ineligiblePromotions": [
    {
      "id": 7,
      "code": "FIRST50",
      "title": "First Order 50% Off",
      "rewardDisplay": "50% off",
      "failureReason": "This offer is for first-time orders only",
      "missingAmount": null
    },
    {
      "id": 5,
      "code": "SAVE200",
      "title": "₹200 off on ₹699",
      "rewardDisplay": "₹200 off",
      "failureReason": "Add ₹200 more to unlock SAVE200",
      "missingAmount": 200.00
    }
  ],
  "recommendedPromotion": { "...same as eligiblePromotions[0]..." },
  "totalEligibleCount": 3
}
```

**Errors:**

| Code | Error |
|---|---|
| 400 | Missing required cart fields |
| 401 | Unauthorized |

---

### `POST /api/promotions/validate`

Validate a manually entered promotion code against the current cart.

**Request Body:**
```json
{
  "promotionCode": "SAVE120",
  "restaurantId": 3,
  "subtotal": 499.00,
  "deliveryFee": 40.00,
  "items": [ { "menuItemId": 101, "categoryId": 5, "quantity": 2, "unitPrice": 150.00 } ]
}
```

**Response 200:**
```json
{
  "promotion": {
    "id": 12,
    "code": "SAVE120",
    "title": "Save ₹120",
    "rewardType": "FLAT_DISCOUNT",
    "rewardDisplay": "₹120 off"
  },
  "actualDiscount": 120.00,
  "finalSubtotal": 379.00,
  "finalTotal": 419.00,
  "message": "Coupon applied! You save ₹120."
}
```

**Errors:**

| Code | `error` field | Description |
|---|---|---|
| 404 | `PROMOTION_NOT_FOUND` | No promotion with that code |
| 409 | `PROMOTION_INELIGIBLE` | Eligible check failed — includes `failureReason` and `missingAmount` |
| 409 | `PROMOTION_STACKING_CONFLICT` | Conflicts with already-applied promotion |
| 410 | `PROMOTION_EXPIRED` | Code exists but expired |
| 429 | `RATE_LIMITED` | Too many attempts |

**Error Response Shape:**
```json
{
  "error": "PROMOTION_INELIGIBLE",
  "message": "Add ₹200 more to unlock this offer",
  "missingAmount": 200.00
}
```

---

### `POST /api/promotions/apply`

Apply a validated promotion to a pending order.

**Request Body:**
```json
{
  "promotionCode": "SAVE120",
  "orderId": 8841
}
```

**Response 200:**
```json
{
  "orderId": 8841,
  "promotionCode": "SAVE120",
  "discountApplied": 120.00,
  "originalTotal": 539.00,
  "finalTotal": 419.00
}
```

---

### `DELETE /api/promotions/apply/{orderId}`

Remove a promotion from a pending order.

**Response 200:**
```json
{
  "orderId": 8841,
  "message": "Promotion removed",
  "finalTotal": 539.00
}
```

---

### `POST /api/admin/promotions` (Admin — SuperUser only)

Create a new promotion with full targeting.

**Request Body:**
```json
{
  "code": "BIRYANI20",
  "title": "20% off on Biryani",
  "description": "Get 20% off when you order from the Biryani category",
  "promoType": "COUPON_CODE",
  "stackMode": "NONE",
  "startsAt": "2026-06-01T00:00:00",
  "expiresAt": "2026-06-30T23:59:59",
  "totalUsageLimit": 500,
  "perUserLimit": 1,
  "isFirstOrderOnly": false,
  "rules": [
    { "ruleType": "MIN_ORDER_AMOUNT", "params": { "minAmount": 200 } }
  ],
  "scopes": [
    { "scopeType": "CATEGORY", "scopeId": 5 }
  ],
  "reward": {
    "rewardType": "PERCENTAGE_DISCOUNT",
    "value": 20,
    "maxCap": 100
  }
}
```

**Response 201:**
```json
{
  "id": 18,
  "code": "BIRYANI20",
  "message": "Promotion created successfully"
}
```

---

## 13. Checkout UX Flow

### 13.1 UX Principles

| Principle | Implementation |
|---|---|
| **Zero friction** | Best promotion auto-applied on cart load |
| **Transparent savings** | "You save ₹120 with SAVE120" always visible |
| **Recoverable** | User can change or remove auto-applied promotion |
| **Actionable rejection** | "Add ₹83 more to unlock SAVE200" — not just "invalid" |
| **Progressive disclosure** | Full list in drawer, not inline, keeps checkout clean |

---

### 13.2 Wireframe 1: Cart Page — Promotion Section

```
┌─────────────────────────────────────────────────────────────────┐
│                         YOUR ORDER                              │
│─────────────────────────────────────────────────────────────────│
│  🍔 Chicken Burger x2                               ₹300.00     │
│  🍟 Crispy Fries x1                                 ₹199.00     │
│─────────────────────────────────────────────────────────────────│
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  🏷️  SAVE120 applied                         ✅ ₹120 off │  │
│  │                                                           │  │
│  │  🎉 You save ₹120 on this order!                          │  │
│  │                                                           │  │
│  │  [View 2 more offers]                  [Remove coupon]   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Subtotal                                           ₹499.00     │
│  Delivery Fee                                        ₹40.00     │
│  Discount (SAVE120)                                -₹120.00     │
│  ─────────────────────────────────────────────────────────       │
│  Total                                              ₹419.00     │
│                                                                 │
│              [    PLACE ORDER — ₹419.00    ]                    │
└─────────────────────────────────────────────────────────────────┘
```

---

### 13.3 Wireframe 2: Promotion Drawer

```
┌─────────────────────────────────────────────────────────────────┐
│  ─────────────  (drag handle)                                   │
│                                                                 │
│  Available Offers  (3)                             [✕ Close]    │
│─────────────────────────────────────────────────────────────────│
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  ⭐ BEST OFFER                                             │  │
│  │  SAVE120  ·  Flat ₹120 off on orders above ₹499           │  │
│  │  Saves you ₹120                            [APPLIED ✓]   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  BIRYANI20  ·  20% off on Biryani (up to ₹100)            │  │
│  │  Saves you ₹99.80  ·  Expires tomorrow                   │  │
│  │                                              [APPLY]      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  FREEDEL  ·  Free Delivery                                │  │
│  │  Saves you ₹40                               [APPLY]      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│─────────────────────────────────────────────────────────────────│
│  Not applicable  (2)                            [Show ▼]        │
│─────────────────────────────────────────────────────────────────│
│                                                                 │
│  Enter a code:  [_____________________]          [APPLY]        │
└─────────────────────────────────────────────────────────────────┘
```

---

### 13.4 Wireframe 3: Ineligible Offers (Expanded)

```
┌─────────────────────────────────────────────────────────────────┐
│  Not applicable  (2)                            [Hide ▲]        │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  🔒 FIRST50  ·  First Order 50% Off                       │  │
│  │  ❌ This offer is for first-time orders only              │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  🔒 SAVE200  ·  ₹200 off on orders above ₹699             │  │
│  │  ➕ Add ₹200 more to unlock SAVE200                       │  │
│  │     [Add more items →]                                    │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

> **"Add more items" CTA** links back to the menu with the current cart preserved. This turns a blocked coupon into an upsell opportunity.

---

### 13.5 Frontend State (React)

```jsx
// context/CartContext.jsx  — additions
const [appliedPromotion, setAppliedPromotion] = useState(null);
// { code, title, actualDiscount, isAutoApplied: true/false }

// hooks/useCheckoutPromotions.js
export function useCheckoutPromotions(cartPayload) {
  return useQuery({
    queryKey: ['checkout-promotions', cartPayload],
    queryFn:  () => api.post('/api/promotions/checkout-eligible', cartPayload),
    staleTime: 1000 * 60 * 2,       // 2 min
    enabled:  cartPayload?.items?.length > 0,
    onSuccess: (data) => {
      // Auto-apply recommended promotion on first load if nothing applied yet
      if (data.recommendedPromotion && !appliedPromotion) {
        setAppliedPromotion({
          ...data.recommendedPromotion,
          isAutoApplied: true
        });
      }
    }
  });
}
```

---

## 14. Spring Boot Class Structure

```
com.broandbro.qrapp
│
├── promotion/
│   │
│   ├── entity/
│   │   ├── Promotion.java
│   │   ├── PromotionRule.java           (entity — maps to promotion_rule table)
│   │   ├── PromotionScope.java          (entity — maps to promotion_scope table)
│   │   ├── PromotionReward.java         (entity — maps to promotion_reward table)
│   │   └── PromotionUsage.java          (entity — maps to promotion_usage table)
│   │
│   ├── enums/
│   │   ├── PromoType.java               (COUPON_CODE, AUTOMATIC_DISCOUNT)
│   │   ├── StackMode.java               (NONE, DELIVERY_ONLY, MULTIPLE_ALLOWED)
│   │   ├── RuleType.java                (MIN_ORDER_AMOUNT, FIRST_ORDER_ONLY, ...)
│   │   ├── ScopeType.java               (RESTAURANT, CATEGORY, MENU_ITEM)
│   │   └── RewardType.java              (PERCENTAGE_DISCOUNT, FLAT_DISCOUNT, FREE_DELIVERY)
│   │
│   ├── rule/
│   │   ├── PromotionRule.java           (interface)
│   │   ├── RuleResult.java              (record)
│   │   ├── impl/
│   │   │   ├── ActiveStatusRule.java
│   │   │   ├── DateRangeRule.java
│   │   │   ├── MinOrderAmountRule.java
│   │   │   ├── FirstOrderOnlyRule.java
│   │   │   ├── PerUserLimitRule.java
│   │   │   └── TotalUsageLimitRule.java
│   │   └── PromotionRuleEngine.java     (orchestrator — loads all rules via @Autowired List<>)
│   │
│   ├── scope/
│   │   ├── PromotionScopeFilter.java
│   │   └── ScopeResult.java             (record)
│   │
│   ├── reward/
│   │   ├── RewardStrategy.java          (interface)
│   │   ├── impl/
│   │   │   ├── PercentageDiscountStrategy.java
│   │   │   ├── FlatDiscountStrategy.java
│   │   │   └── FreeDeliveryStrategy.java
│   │   └── RewardEngine.java            (registry + compute)
│   │
│   ├── segmentation/
│   │   ├── UserSegment.java             (enum)
│   │   └── SegmentationService.java
│   │
│   ├── stacking/
│   │   ├── StackingValidator.java
│   │   └── StackingResult.java          (record)
│   │
│   ├── scoring/
│   │   └── PromotionScoringService.java
│   │
│   ├── eligibility/
│   │   ├── EligibilityContext.java      (record)
│   │   ├── UserContext.java             (record)
│   │   ├── CartContext.java             (record)
│   │   ├── CartItem.java                (record)
│   │   ├── EligibilityResult.java       (record)
│   │   ├── EligiblePromotion.java       (record — internal)
│   │   └── PromotionEligibilityService.java  (main orchestration service)
│   │
│   ├── service/
│   │   └── PromotionRedemptionService.java   (apply, remove, validate at order time)
│   │
│   ├── repository/
│   │   ├── PromotionRepository.java
│   │   ├── PromotionRuleRepository.java
│   │   ├── PromotionScopeRepository.java
│   │   ├── PromotionRewardRepository.java
│   │   └── PromotionUsageRepository.java
│   │
│   ├── dto/
│   │   ├── CheckoutPromotionsRequest.java
│   │   ├── CheckoutPromotionsResponse.java
│   │   ├── EligiblePromotionDto.java
│   │   ├── IneligiblePromotionDto.java
│   │   ├── ValidatePromotionRequest.java
│   │   ├── ValidatePromotionResponse.java
│   │   ├── ApplyPromotionRequest.java
│   │   ├── ApplyPromotionResponse.java
│   │   └── CreatePromotionRequest.java
│   │
│   └── controller/
│       ├── PromotionController.java      (user-facing — checkout eligible, validate, apply)
│       └── AdminPromotionController.java (admin — CRUD, @PreAuthorize isSuperUser)
│
└── (existing packages — entity, service, repository, etc. — unchanged)
```

**Key design point:** The entire promotion engine lives in a **self-contained `promotion/` package**. It does not modify existing `CouponService`, `OrderService`, or entity classes in Phase 1 — except adding `order_count` and `last_order_at` to `User`.

---

## 15. Example Promotion Configurations

### Example 1: Simple Flat Coupon

```json
{
  "code": "SAVE120",
  "title": "Save ₹120",
  "promoType": "COUPON_CODE",
  "stackMode": "NONE",
  "rules": [
    { "ruleType": "MIN_ORDER_AMOUNT", "params": { "minAmount": 499 } }
  ],
  "scopes": [],
  "reward": { "rewardType": "FLAT_DISCOUNT", "value": 120, "maxCap": null }
}
```

---

### Example 2: Category-Specific Percentage Coupon

```json
{
  "code": "BIRYANI20",
  "title": "20% off on Biryani",
  "promoType": "COUPON_CODE",
  "stackMode": "DELIVERY_ONLY",
  "rules": [
    { "ruleType": "MIN_ORDER_AMOUNT", "params": { "minAmount": 200 } }
  ],
  "scopes": [
    { "scopeType": "CATEGORY", "scopeId": 5 }
  ],
  "reward": { "rewardType": "PERCENTAGE_DISCOUNT", "value": 20, "maxCap": 100 }
}
```

---

### Example 3: First Order Coupon (50% off, capped)

```json
{
  "code": "WELCOME50",
  "title": "Welcome! 50% off your first order",
  "promoType": "COUPON_CODE",
  "stackMode": "NONE",
  "isFirstOrderOnly": true,
  "totalUsageLimit": null,
  "perUserLimit": 1,
  "rules": [],
  "scopes": [],
  "reward": { "rewardType": "PERCENTAGE_DISCOUNT", "value": 50, "maxCap": 150 }
}
```

---

### Example 4: Free Delivery (Automatic Discount — no code needed)

```json
{
  "code": null,
  "title": "Free Delivery this Weekend",
  "promoType": "AUTOMATIC_DISCOUNT",
  "stackMode": "MULTIPLE_ALLOWED",
  "startsAt": "2026-06-06T00:00:00",
  "expiresAt": "2026-06-07T23:59:59",
  "rules": [
    { "ruleType": "MIN_ORDER_AMOUNT", "params": { "minAmount": 199 } }
  ],
  "scopes": [],
  "reward": { "rewardType": "FREE_DELIVERY", "value": 1, "maxCap": null }
}
```

---

### Example 5: Restaurant-Specific Deal

```json
{
  "code": "BBSPECIAL",
  "title": "₹80 off at Bro & Bro Kitchen",
  "promoType": "COUPON_CODE",
  "stackMode": "NONE",
  "rules": [
    { "ruleType": "MIN_ORDER_AMOUNT", "params": { "minAmount": 299 } }
  ],
  "scopes": [
    { "scopeType": "RESTAURANT", "scopeId": 1 }
  ],
  "reward": { "rewardType": "FLAT_DISCOUNT", "value": 80, "maxCap": null }
}
```

---

### Example 6: Stacked — 20% Off + Free Delivery

```json
[
  {
    "code": "DINE20",
    "stackMode": "DELIVERY_ONLY",
    "reward": { "rewardType": "PERCENTAGE_DISCOUNT", "value": 20, "maxCap": 100 }
  },
  {
    "code": "FREEDEL",
    "stackMode": "MULTIPLE_ALLOWED",
    "reward": { "rewardType": "FREE_DELIVERY", "value": 1 }
  }
]
// User can apply DINE20 + FREEDEL together.
// DINE20 (stackMode=DELIVERY_ONLY) allows adding FREE_DELIVERY.
```

---

## 16. Implementation Roadmap

### Phase 1 — Core Promotion Engine (Weeks 1–5)
**Goal:** Backend engine + checkout UI with auto-suggest + manual code entry

#### Week 1–2: Database & Domain

| Task | Notes |
|---|---|
| Flyway migration: create `promotion`, `promotion_rule`, `promotion_scope`, `promotion_reward`, `promotion_usage` tables | Use versioned V2__ scripts |
| Flyway migration: `ALTER TABLE users ADD COLUMN order_count, last_order_at` | |
| JPA entities: `Promotion`, `PromotionRule`, `PromotionScope`, `PromotionReward`, `PromotionUsage` | |
| Enums: `PromoType`, `StackMode`, `RuleType`, `ScopeType`, `RewardType` | |
| Repositories with `findCandidates` custom query | |

**Data migration script** — map existing `coupon` table rows to `promotion` + child tables:
```sql
-- Insert into promotion
INSERT INTO promotion (id, code, title, description, promo_type, stack_mode,
                       is_active, is_first_order_only, starts_at, expires_at,
                       total_usage_limit, per_user_limit, created_by, created_at, updated_at)
SELECT id, code, title, description, 'COUPON_CODE', 'NONE',
       is_active, is_first_order_only, starts_at, expires_at,
       total_usage_limit, per_user_limit, created_by, created_at, updated_at
FROM coupon;

-- Insert into promotion_reward
INSERT INTO promotion_reward (promotion_id, reward_type, value, max_cap)
SELECT id,
       CASE discount_type
           WHEN 'PERCENTAGE' THEN 'PERCENTAGE_DISCOUNT'
           WHEN 'FIXED'      THEN 'FLAT_DISCOUNT'
       END,
       discount_value,
       max_discount_amount
FROM coupon;

-- Insert MIN_ORDER_AMOUNT rules for coupons that had min_order_amount set
INSERT INTO promotion_rule (promotion_id, rule_type, params)
SELECT id, 'MIN_ORDER_AMOUNT', jsonb_build_object('minAmount', min_order_amount)
FROM coupon
WHERE min_order_amount IS NOT NULL;

-- Migrate coupon_redemption → promotion_usage
INSERT INTO promotion_usage (promotion_id, user_id, order_id, discount_amount,
                              order_subtotal, promotion_code, redeemed_at)
SELECT cr.coupon_id, cr.user_id, cr.order_id, cr.discount_amount,
       0, c.code, cr.redeemed_at
FROM coupon_redemption cr
JOIN coupon c ON c.id = cr.coupon_id;
```

#### Week 3: Rule & Reward Engine

| Task | Notes |
|---|---|
| `PromotionRule` interface + all 6 rule implementations | Unit test each rule in isolation |
| `PromotionRuleEngine` orchestrator | Integration test with H2 |
| `PromotionScopeFilter` | Test RESTAURANT / CATEGORY / MENU_ITEM cases |
| `RewardStrategy` interface + 3 strategies | Unit test edge cases (cap, delivery fee = 0) |
| `RewardEngine` registry | |
| `SegmentationService` | |
| `StackingValidator` | |

#### Week 4: Eligibility & APIs

| Task | Notes |
|---|---|
| `PromotionEligibilityService` (main orchestration) | |
| `PromotionScoringService` | |
| `PromotionController` — 3 user endpoints | |
| `AdminPromotionController` — CRUD | |
| Redis caching layer (checkout results, usage counts) | |
| Rate limiting on validate endpoint (10 req/min/user) | |

#### Week 5: Frontend

| Task | Notes |
|---|---|
| `useCheckoutPromotions` TanStack Query hook | |
| Add `appliedPromotion` to `CartContext` | |
| Promotion section in `cart.jsx` (savings banner + "View X offers" pill) | |
| `PromotionDrawer` component (Groups A/B/C) | Reuse existing Shadcn `Drawer` |
| `PromotionCard` component (eligible + ineligible variants) | |
| "Add ₹X more" CTA deep-link to menu | |
| Admin promotion create/edit form | |

**Phase 1 Acceptance Criteria:**
- ✅ User sees auto-applied best promotion on cart page
- ✅ "You save ₹X with CODE" shown correctly
- ✅ Promotion drawer shows eligible + ineligible with reasons
- ✅ "Add ₹X more to unlock" shown for min-amount failures
- ✅ Manual code entry still works
- ✅ Stacking validation blocks/allows correctly
- ✅ Existing coupon data migrated and functional

---

## 17. Future Enhancements

The Phase 1 engine is designed to accommodate all of these **without breaking changes** — new rule types, reward types, and scope types are additive.

### Phase 2 — Advanced Recommendation (Q3 2026)

- Weighted multi-factor scoring (targeting bonus, exclusivity bonus)
- User segment rules (`USER_SEGMENT` rule type + `SegmentationService` integration)
- Automatic promotions (no code required) surfaced at checkout
- "Unlock threshold" smart messaging ("₹50 more = free delivery + ₹100 off")
- Happy Hour promotions (time-window rules)

### Phase 3 — Campaign Management (Q4 2026)

- `promotion_campaign` table with budget cap tracking
- Campaign-level analytics dashboard
- Bulk promotion creation for festival campaigns
- Campaign start/end notification to users (push/WhatsApp)

### Phase 4 — Machine Learning Recommendations (Q1 2027)

- ML feature store based on `promotion_usage` history
- Collaborative filtering: "users like you redeemed X"
- Personalized promotion scoring override via `MLScoringStrategy`
- A/B test: ML score vs. rule-based score (same `RewardScoringService` interface)

### Phase 5 — Dynamic Personalized Promotions (Q2 2027)

- Auto-generate 1-time personal promotion codes for inactive users
- Re-engagement campaigns: `COME_BACK_{userId}` coupons
- Loyalty tier-based automatic discounts
- Buy X Get Y (`BUY_X_GET_Y` reward type — implements `RewardStrategy`)

### Phase 6 — Experimentation / A/B Testing (Q3 2027)

- Experiment framework with variant assignment table
- Coupon auto-apply vs. suggest-only A/B test
- Ranking algorithm variants (simple vs. ML)
- Statistical significance reporting on conversion lift

### Migration Path: Phase 1 → Phase 6

```
Phase 1  → Phase 2:  Add USER_SEGMENT rule type + SegmentationService rules
Phase 2  → Phase 3:  Add promotion_campaign table + FK on promotion.campaign_id
Phase 3  → Phase 4:  Implement MLScoringStrategy; toggle via @ConditionalOnProperty
Phase 4  → Phase 5:  Add BUY_X_GET_Y to RewardType enum; implement BuyXGetYStrategy
Phase 5  → Phase 6:  Add user_ab_assignments table; wrap ScoringService with experiment context
```

At every phase, the **core domain model (Promotion → Rules → Scopes → Reward)** remains unchanged. All extensions are additive — new enum values, new strategy implementations, new rule handlers.

---

*Document version 2.0 — Promotion Engine · qrapp*  
*Supersedes: COUPON_ENGINE_DESIGN.md (v1.0)*

