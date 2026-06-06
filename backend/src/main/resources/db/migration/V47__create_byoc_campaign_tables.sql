-- =============================================================================
-- V47__create_byoc_campaign_tables.sql
-- "Build Your Own Combo" (BYOC) — customer-driven combo campaigns with
-- graduated discount tiers and category-level eligibility rules.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. combo_campaigns  — top-level campaign definition
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS combo_campaigns (
    id               BIGSERIAL    PRIMARY KEY,
    name             VARCHAR(150) NOT NULL,
    description      TEXT,
    status           VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',   -- DRAFT|ACTIVE|INACTIVE|DELETED
    is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
    starts_at        TIMESTAMPTZ,
    ends_at          TIMESTAMPTZ,
    display_priority INTEGER      NOT NULL DEFAULT 0,
    created_by       VARCHAR(100),
    updated_by       VARCHAR(100),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ,
    version          BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_campaign_status CHECK (status IN ('DRAFT','ACTIVE','INACTIVE','DELETED'))
);

CREATE INDEX idx_combo_campaigns_status      ON combo_campaigns (status)    WHERE deleted_at IS NULL;
CREATE INDEX idx_combo_campaigns_is_active   ON combo_campaigns (is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_combo_campaigns_dates       ON combo_campaigns (starts_at, ends_at);

COMMENT ON TABLE combo_campaigns IS 'BYOC campaign header — links tiers and eligibility rules.';

-- ---------------------------------------------------------------------------
-- 2. combo_campaign_tiers — graduated discount ladder per campaign
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS combo_campaign_tiers (
    id             BIGSERIAL    PRIMARY KEY,
    campaign_id    BIGINT       NOT NULL REFERENCES combo_campaigns(id) ON DELETE CASCADE,
    min_items      INTEGER      NOT NULL CHECK (min_items >= 2),
    discount_type  VARCHAR(20)  NOT NULL DEFAULT 'PERCENTAGE',  -- PERCENTAGE | FIXED
    discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
    tier_label     VARCHAR(100),
    sort_order     INTEGER      NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_campaign_tier_min_items UNIQUE (campaign_id, min_items)
);

CREATE INDEX idx_campaign_tiers_campaign ON combo_campaign_tiers (campaign_id);

COMMENT ON TABLE combo_campaign_tiers IS 'Graduated discount tiers: e.g. 2 items→5%, 3 items→10%.';

-- ---------------------------------------------------------------------------
-- 3. combo_campaign_eligibility — which categories / items qualify per campaign
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS combo_campaign_eligibility (
    id          BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT    NOT NULL REFERENCES combo_campaigns(id) ON DELETE CASCADE,
    category_id BIGINT    REFERENCES category(id) ON DELETE CASCADE,
    menu_item_id BIGINT   REFERENCES menu_item(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_eligibility_one_of CHECK (
        (category_id IS NOT NULL AND menu_item_id IS NULL) OR
        (category_id IS NULL AND menu_item_id IS NOT NULL)
    )
);

CREATE INDEX idx_campaign_elig_campaign  ON combo_campaign_eligibility (campaign_id);
CREATE INDEX idx_campaign_elig_category  ON combo_campaign_eligibility (category_id);
CREATE INDEX idx_campaign_elig_menuitem  ON combo_campaign_eligibility (menu_item_id);

COMMENT ON TABLE combo_campaign_eligibility IS 'Defines which categories or items are eligible for a BYOC campaign.';

