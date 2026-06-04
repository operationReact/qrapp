-- =============================================================================
-- MILESTONE REWARDS — Migration
-- Version  : V41
-- Date     : 2026-06-04
-- Description: Creates tables for the admin-configurable milestone reward
--              system. Users automatically receive personalised coupon codes
--              when their cumulative lifetime spend crosses a threshold.
-- =============================================================================

-- ── MILESTONE_CONFIG ──────────────────────────────────────────────────────────
-- Admin-managed table of spending thresholds and reward definitions.
-- Seeded at startup by MilestoneCouponService if empty.
CREATE TABLE milestone_config (
    id               BIGSERIAL       PRIMARY KEY,
    threshold_amount NUMERIC(10, 2)  NOT NULL UNIQUE,
    discount_pct     NUMERIC(5,  2)  NOT NULL,
    max_cap          NUMERIC(10, 2)  NOT NULL,
    validity_days    INTEGER         NOT NULL,
    is_active        BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_milestone_config_active ON milestone_config(is_active);

-- ── USER_MILESTONE ────────────────────────────────────────────────────────────
-- Tracks which milestones each user has already been rewarded for.
-- Unique constraint on (user_id, milestone_amount) prevents double-issuing.
CREATE TABLE user_milestone (
    id                      BIGSERIAL       PRIMARY KEY,
    user_id                 BIGINT          NOT NULL REFERENCES users(id),
    milestone_amount        NUMERIC(10, 2)  NOT NULL,
    coupon_code             VARCHAR(50)     NOT NULL,
    lifetime_spend_at_award NUMERIC(12, 2)  NOT NULL,
    awarded_at              TIMESTAMP       NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_milestone UNIQUE (user_id, milestone_amount)
);

CREATE INDEX idx_user_milestone_user ON user_milestone(user_id);

