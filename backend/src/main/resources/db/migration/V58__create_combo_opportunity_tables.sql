-- =============================================================================
-- V58__create_combo_opportunity_tables.sql
-- Date: 2026-06-10
-- Description: AI-generated combo opportunity review queue.
--   combo_opportunity                 – one opportunity per suggested combo
--   combo_opportunity_item            – items in each opportunity slot
--   combo_opportunity_item_alternative – valid replacement options per slot
--
-- Uses CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS so this script
-- is safe to re-run if Flyway marked a previous attempt as FAILED.
-- =============================================================================

-- ── 1. combo_opportunity ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS combo_opportunity (
    id                    BIGSERIAL      PRIMARY KEY,
    combo_name            VARCHAR(150)   NOT NULL,
    status                VARCHAR(30)    NOT NULL DEFAULT 'PENDING_REVIEW',
    -- Quality metrics (INTEGER, not SMALLINT, to match Hibernate's Integer mapping)
    confidence            NUMERIC(5,4)   NOT NULL DEFAULT 0,
    quality_score         INTEGER        NOT NULL DEFAULT 0,
    -- Pricing
    individual_price      NUMERIC(10,2)  NOT NULL DEFAULT 0,
    suggested_price       NUMERIC(10,2)  NOT NULL DEFAULT 0,
    profit                NUMERIC(10,2)  NOT NULL DEFAULT 0,
    margin                NUMERIC(5,2)   NOT NULL DEFAULT 0,
    revenue_impact        NUMERIC(5,2)   NOT NULL DEFAULT 0,
    attachment_confidence INTEGER        NOT NULL DEFAULT 0,
    -- Generation metadata
    co_order_count        INTEGER        NOT NULL DEFAULT 0,
    reasons               TEXT,          -- JSON array: ["Ordered together 27 times", ...]
    -- Workflow
    reviewed_by           VARCHAR(100),
    reviewed_at           TIMESTAMPTZ,
    generated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    created_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_combo_opp_status CHECK (
        status IN ('PENDING_REVIEW', 'APPROVED', 'LIVE', 'REJECTED')
    )
);

CREATE INDEX IF NOT EXISTS idx_combo_opp_status ON combo_opportunity (status);

COMMENT ON TABLE  combo_opportunity         IS 'AI-generated combo suggestions from co-occurrence analysis, pending admin review.';
COMMENT ON COLUMN combo_opportunity.reasons IS 'JSON text array of human-readable generation reasons.';

-- ── 2. combo_opportunity_item ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS combo_opportunity_item (
    id              BIGSERIAL      PRIMARY KEY,
    opportunity_id  BIGINT         NOT NULL REFERENCES combo_opportunity(id) ON DELETE CASCADE,
    menu_item_id    BIGINT         NOT NULL REFERENCES menu_item(id)         ON DELETE RESTRICT,
    item_name       VARCHAR(150)   NOT NULL,
    item_price      NUMERIC(10,2)  NOT NULL DEFAULT 0,
    sort_order      INTEGER        NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_combo_opp_item_opp ON combo_opportunity_item (opportunity_id);

COMMENT ON TABLE combo_opportunity_item IS 'Menu-item slots within an AI-generated combo opportunity.';

-- ── 3. combo_opportunity_item_alternative ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS combo_opportunity_item_alternative (
    id                   BIGSERIAL      PRIMARY KEY,
    opportunity_item_id  BIGINT         NOT NULL REFERENCES combo_opportunity_item(id) ON DELETE CASCADE,
    menu_item_id         BIGINT         NOT NULL REFERENCES menu_item(id)              ON DELETE RESTRICT,
    item_name            VARCHAR(150)   NOT NULL,
    item_price           NUMERIC(10,2)  NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_combo_opp_alt_slot ON combo_opportunity_item_alternative (opportunity_item_id);

COMMENT ON TABLE combo_opportunity_item_alternative
    IS 'Valid replacement items for each slot in a combo opportunity (enforces combo quality).';

