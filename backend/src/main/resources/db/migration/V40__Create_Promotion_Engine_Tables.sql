-- =============================================================================
-- PROMOTION ENGINE — Phase 1 Migration
-- Version  : V40
-- Date     : 2026-06-04
-- Description: Creates the promotion engine tables as a self-contained module
--              alongside the existing coupon system. The coupon system remains
--              unchanged; promotions are a new parallel domain.
-- =============================================================================

-- ── PROMOTION ────────────────────────────────────────────────────────────────
CREATE TABLE promotion (
    id                  BIGSERIAL       PRIMARY KEY,
    code                VARCHAR(50)     UNIQUE,                -- NULL for automatic discounts
    title               VARCHAR(100)    NOT NULL,
    description         VARCHAR(500),
    promo_type          VARCHAR(30)     NOT NULL DEFAULT 'COUPON_CODE',
    stack_mode          VARCHAR(30)     NOT NULL DEFAULT 'NONE',
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    is_first_order_only BOOLEAN         NOT NULL DEFAULT FALSE,
    starts_at           TIMESTAMP,
    expires_at          TIMESTAMP,
    total_usage_limit   INTEGER,
    per_user_limit      INTEGER,
    created_by          VARCHAR(100),
    updated_by          VARCHAR(100),
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_promotion_is_active   ON promotion(is_active);
CREATE INDEX idx_promotion_expires_at  ON promotion(expires_at);
CREATE INDEX idx_promotion_promo_type  ON promotion(promo_type);

-- ── PROMOTION_RULE ────────────────────────────────────────────────────────────
-- Each row is one rule that must pass (AND logic).
-- params is stored as TEXT/JSONB, e.g. {"minAmount": 299}
CREATE TABLE promotion_rule (
    id           BIGSERIAL    PRIMARY KEY,
    promotion_id BIGINT       NOT NULL REFERENCES promotion(id) ON DELETE CASCADE,
    rule_type    VARCHAR(40)  NOT NULL,
    params       TEXT         NOT NULL DEFAULT '{}',
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_promo_rule_promotion ON promotion_rule(promotion_id);

-- ── PROMOTION_SCOPE ───────────────────────────────────────────────────────────
-- Generic targeting: (RESTAURANT|CATEGORY|MENU_ITEM) × scope_id.
-- Empty set = applies to all. Non-empty = cart must match at least one per type.
CREATE TABLE promotion_scope (
    id           BIGSERIAL   PRIMARY KEY,
    promotion_id BIGINT      NOT NULL REFERENCES promotion(id) ON DELETE CASCADE,
    scope_type   VARCHAR(30) NOT NULL,   -- RESTAURANT, CATEGORY, MENU_ITEM
    scope_id     BIGINT      NOT NULL
);

CREATE INDEX idx_promo_scope_promotion ON promotion_scope(promotion_id);
CREATE INDEX idx_promo_scope_type_id   ON promotion_scope(scope_type, scope_id);

-- ── PROMOTION_REWARD ──────────────────────────────────────────────────────────
-- One reward per promotion (1:1).
CREATE TABLE promotion_reward (
    id           BIGSERIAL       PRIMARY KEY,
    promotion_id BIGINT          NOT NULL UNIQUE REFERENCES promotion(id) ON DELETE CASCADE,
    reward_type  VARCHAR(30)     NOT NULL,   -- PERCENTAGE_DISCOUNT, FLAT_DISCOUNT, FREE_DELIVERY
    value        NUMERIC(10, 2)  NOT NULL,
    max_cap      NUMERIC(10, 2),
    created_at   TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- ── PROMOTION_USAGE ───────────────────────────────────────────────────────────
-- Append-only audit log of every redemption.
CREATE TABLE promotion_usage (
    id               BIGSERIAL       PRIMARY KEY,
    promotion_id     BIGINT          NOT NULL REFERENCES promotion(id),
    user_id          BIGINT          NOT NULL REFERENCES users(id),
    order_id         BIGINT          NOT NULL REFERENCES orders(id),
    promotion_code   VARCHAR(50),
    discount_amount  NUMERIC(10, 2)  NOT NULL,
    order_subtotal   NUMERIC(10, 2)  NOT NULL DEFAULT 0,
    redeemed_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_promo_usage_promotion  ON promotion_usage(promotion_id);
CREATE INDEX idx_promo_usage_user       ON promotion_usage(user_id);
CREATE INDEX idx_promo_usage_promo_user ON promotion_usage(promotion_id, user_id);

