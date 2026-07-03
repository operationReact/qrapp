-- =============================================================================
-- RECOMMENDATION ENGINE — Migration
-- Version  : V46
-- Date     : 2026-06-06
-- Description: Creates the 5-table recommendation engine as a self-contained
--              module. Supports L1 manual mappings, L2 co-occurrence stats +
--              admin-review suggestions, L4 upsell rules, L5 category pairings.
--              L3 (Combo Builder) reuses existing combos table.
-- =============================================================================

-- ── L1: MANUAL ITEM RECOMMENDATIONS ─────────────────────────────────────────
-- Admin maps source_item → target_item with optional display order.
CREATE TABLE rec_item_recommendation (
    id               BIGSERIAL    PRIMARY KEY,
    source_item_id   BIGINT       NOT NULL REFERENCES menu_item(id) ON DELETE CASCADE,
    target_item_id   BIGINT       NOT NULL REFERENCES menu_item(id) ON DELETE CASCADE,
    display_order    INTEGER      NOT NULL DEFAULT 0,
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by       VARCHAR(100),
    updated_by       VARCHAR(100),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_rec_item_pair UNIQUE (source_item_id, target_item_id),
    CONSTRAINT chk_rec_not_self CHECK (source_item_id <> target_item_id)
);

CREATE INDEX idx_rec_item_source     ON rec_item_recommendation (source_item_id) WHERE is_active = TRUE;
CREATE INDEX idx_rec_item_target     ON rec_item_recommendation (target_item_id);

COMMENT ON TABLE rec_item_recommendation IS 'L1: Admin-curated item→item recommendation pairs.';

-- ── L2a: CO-OCCURRENCE STATS (computed nightly) ───────────────────────────
-- Stores pair-wise order co-occurrence. Nightly job upserts.
CREATE TABLE rec_co_occurrence_stat (
    id             BIGSERIAL      PRIMARY KEY,
    item_a_id      BIGINT         NOT NULL REFERENCES menu_item(id) ON DELETE CASCADE,
    item_b_id      BIGINT         NOT NULL REFERENCES menu_item(id) ON DELETE CASCADE,
    co_count       INTEGER        NOT NULL DEFAULT 0,  -- times both appeared in same order
    item_a_count   INTEGER        NOT NULL DEFAULT 0,  -- total orders containing item_a
    confidence     NUMERIC(5,4)   NOT NULL DEFAULT 0,  -- co_count / item_a_count
    lift           NUMERIC(8,4)   NOT NULL DEFAULT 0,
    computed_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_co_occurrence_pair UNIQUE (item_a_id, item_b_id),
    CONSTRAINT chk_co_occurrence_not_self CHECK (item_a_id <> item_b_id)
);

CREATE INDEX idx_co_occurrence_item_a ON rec_co_occurrence_stat (item_a_id);
CREATE INDEX idx_co_occurrence_conf   ON rec_co_occurrence_stat (confidence DESC);

COMMENT ON TABLE rec_co_occurrence_stat IS 'L2: Nightly-computed item co-occurrence statistics.';

-- ── L2b: AUTO SUGGESTIONS (admin review queue) ────────────────────────────
-- Nightly job creates PENDING rows; admin Accepts or Rejects.
CREATE TABLE rec_auto_suggestion (
    id              BIGSERIAL   PRIMARY KEY,
    item_a_id       BIGINT      NOT NULL REFERENCES menu_item(id) ON DELETE CASCADE,
    item_b_id       BIGINT      NOT NULL REFERENCES menu_item(id) ON DELETE CASCADE,
    confidence      NUMERIC(5,4) NOT NULL,
    co_count        INTEGER     NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING | ACCEPTED | REJECTED
    reviewed_by     VARCHAR(100),
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_auto_suggestion_pair UNIQUE (item_a_id, item_b_id),
    CONSTRAINT chk_auto_suggestion_status CHECK (status IN ('PENDING','ACCEPTED','REJECTED'))
);

CREATE INDEX idx_auto_suggestion_status   ON rec_auto_suggestion (status) WHERE status = 'PENDING';
CREATE INDEX idx_auto_suggestion_item_a   ON rec_auto_suggestion (item_a_id);

COMMENT ON TABLE rec_auto_suggestion IS 'L2: Auto-generated suggestions pending admin review.';

-- ── L4: UPSELL RULES ─────────────────────────────────────────────────────
-- Trigger condition → offer items at a discount.
CREATE TABLE rec_upsell_rule (
    id              BIGSERIAL      PRIMARY KEY,
    name            VARCHAR(150)   NOT NULL,
    trigger_type    VARCHAR(40)    NOT NULL,   -- ITEM_IN_CART | CATEGORY_IN_CART | CART_VALUE_EXCEEDS
    trigger_item_id BIGINT         REFERENCES menu_item(id) ON DELETE SET NULL,
    trigger_cat_id  BIGINT         REFERENCES category(id) ON DELETE SET NULL,
    min_cart_value  NUMERIC(10,2),             -- used when trigger_type = CART_VALUE_EXCEEDS
    reward_type     VARCHAR(30)    NOT NULL DEFAULT 'FIXED_DISCOUNT',  -- FIXED_DISCOUNT | PERCENT_DISCOUNT
    reward_value    NUMERIC(10,2)  NOT NULL DEFAULT 0,
    is_active       BOOLEAN        NOT NULL DEFAULT TRUE,
    display_order   INTEGER        NOT NULL DEFAULT 0,
    created_by      VARCHAR(100),
    updated_by      VARCHAR(100),
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_upsell_rule_is_active ON rec_upsell_rule (is_active) WHERE is_active = TRUE;

COMMENT ON TABLE rec_upsell_rule IS 'L4: Upsell trigger rules (item/category/cart-value based).';

-- ── L4: UPSELL RULE TARGETS ───────────────────────────────────────────────
-- Items to offer when the rule triggers.
CREATE TABLE rec_upsell_rule_target (
    id          BIGSERIAL   PRIMARY KEY,
    rule_id     BIGINT      NOT NULL REFERENCES rec_upsell_rule(id) ON DELETE CASCADE,
    item_id     BIGINT      NOT NULL REFERENCES menu_item(id) ON DELETE CASCADE,
    sort_order  INTEGER     NOT NULL DEFAULT 0,
    CONSTRAINT uq_upsell_target UNIQUE (rule_id, item_id)
);

CREATE INDEX idx_upsell_rule_target_rule ON rec_upsell_rule_target (rule_id);

COMMENT ON TABLE rec_upsell_rule_target IS 'L4: Target items offered by an upsell rule.';

-- ── L5: CATEGORY PAIRING RULES ────────────────────────────────────────────
-- Fallback: if no L1/L2 match, recommend items from the paired category.
CREATE TABLE rec_category_pairing (
    id               BIGSERIAL   PRIMARY KEY,
    source_cat_id    BIGINT      NOT NULL REFERENCES category(id) ON DELETE CASCADE,
    target_cat_id    BIGINT      NOT NULL REFERENCES category(id) ON DELETE CASCADE,
    display_order    INTEGER     NOT NULL DEFAULT 0,
    is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
    created_by       VARCHAR(100),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cat_pairing UNIQUE (source_cat_id, target_cat_id),
    CONSTRAINT chk_cat_pairing_not_self CHECK (source_cat_id <> target_cat_id)
);

CREATE INDEX idx_cat_pairing_source ON rec_category_pairing (source_cat_id) WHERE is_active = TRUE;

COMMENT ON TABLE rec_category_pairing IS 'L5: Category-level fallback pairing rules.';

