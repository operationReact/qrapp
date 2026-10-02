-- =============================================================================
-- V100__create_home_campaigns.sql
-- Dynamic, CMS-driven Home page campaigns (HERO billboard, DISCOVERY tiles,
-- PROMOTION cards). Admin-managed; customer Home page renders whatever is
-- currently active here — no campaign content is hard-coded in the frontend.
-- =============================================================================

CREATE TABLE IF NOT EXISTS home_campaigns (
    id                BIGSERIAL    PRIMARY KEY,

    -- Owning location. NULL = GLOBAL (visible at every location). A non-null
    -- value scopes the campaign to that single location only, matching the
    -- same location-isolation principle used by menus/orders/combo_campaigns.
    location_id       BIGINT       REFERENCES locations(id),

    type              VARCHAR(20)  NOT NULL,   -- HERO | DISCOVERY | PROMOTION
    badge             VARCHAR(100),
    title             VARCHAR(150) NOT NULL,
    subtitle          VARCHAR(255),
    cta_label         VARCHAR(50),

    image_url         TEXT,
    image_key         TEXT,
    mobile_image_url  TEXT,
    mobile_image_key  TEXT,

    target_type       VARCHAR(20)  NOT NULL DEFAULT 'NONE', -- NONE|CATEGORY|MENU_ITEM|COMBO|PARTY_ORDER|CAMPAIGN|EXTERNAL
    target_id         VARCHAR(150),

    visual_variant    VARCHAR(30),             -- optional styling hint, e.g. GREEN_DEAL, RED_PARTY

    display_order     INTEGER      NOT NULL DEFAULT 0,
    is_active         BOOLEAN      NOT NULL DEFAULT TRUE,

    starts_at         TIMESTAMPTZ,
    ends_at           TIMESTAMPTZ,

    created_by        VARCHAR(100),
    updated_by        VARCHAR(100),
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at        TIMESTAMPTZ,
    version           BIGINT       NOT NULL DEFAULT 0,

    CONSTRAINT chk_home_campaign_type CHECK (type IN ('HERO','DISCOVERY','PROMOTION')),
    CONSTRAINT chk_home_campaign_target_type CHECK (
        target_type IN ('NONE','CATEGORY','MENU_ITEM','COMBO','PARTY_ORDER','CAMPAIGN','EXTERNAL')
    )
);

CREATE INDEX IF NOT EXISTS idx_home_campaigns_location
    ON home_campaigns (location_id);

CREATE INDEX IF NOT EXISTS idx_home_campaigns_public_feed
    ON home_campaigns (type, deleted_at, is_active, display_order);

CREATE INDEX IF NOT EXISTS idx_home_campaigns_schedule
    ON home_campaigns (starts_at, ends_at);

COMMENT ON TABLE home_campaigns IS
    'Admin-managed Home page promotional content (hero billboard, discovery tiles, promotion cards). location_id NULL = global/all-locations.';
COMMENT ON COLUMN home_campaigns.target_id IS
    'Interpreted according to target_type. For CATEGORY this is the category NAME (categories are per-location, so campaigns reference them by name, matching the existing hash-based category navigation).';
