-- =============================================================================
-- V30__create_combo_management_tables.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. combos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS combos (
    id                   BIGSERIAL        PRIMARY KEY,
    combo_name           VARCHAR(150)     NOT NULL,
    short_name           VARCHAR(60)      NOT NULL,
    description          TEXT,
    category_id          BIGINT           REFERENCES category(id) ON DELETE SET NULL,
    combo_type           VARCHAR(20)      NOT NULL DEFAULT 'VEG',      -- VEG|NON_VEG|MIXED
    original_price       NUMERIC(10,2)    NOT NULL,
    combo_price          NUMERIC(10,2)    NOT NULL,
    savings_amount       NUMERIC(10,2)    NOT NULL GENERATED ALWAYS AS (original_price - combo_price) STORED,
    savings_percentage   NUMERIC(5,2)     NOT NULL,
    image_url            TEXT,
    is_featured          BOOLEAN          NOT NULL DEFAULT FALSE,
    is_preorder_eligible BOOLEAN          NOT NULL DEFAULT FALSE,
    is_signature_combo   BOOLEAN          NOT NULL DEFAULT FALSE,
    is_active            BOOLEAN          NOT NULL DEFAULT TRUE,
    status               VARCHAR(20)      NOT NULL DEFAULT 'ACTIVE',   -- DRAFT|ACTIVE|INACTIVE|DELETED
    time_slot            VARCHAR(20)      NOT NULL DEFAULT 'FULL_DAY', -- BREAKFAST|LUNCH|EVENING|FULL_DAY|CUSTOM
    display_priority     INTEGER          NOT NULL DEFAULT 0,
    created_by           VARCHAR(100),
    updated_by           VARCHAR(100),
    created_at           TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    deleted_at           TIMESTAMPTZ,
    version              BIGINT           NOT NULL DEFAULT 0,          -- optimistic locking
    CONSTRAINT chk_combo_price CHECK (combo_price > 0),
    CONSTRAINT chk_combo_price_lower CHECK (combo_price < original_price),
    CONSTRAINT chk_combo_savings_pct CHECK (savings_percentage >= 0 AND savings_percentage <= 100)
);

CREATE INDEX idx_combos_category       ON combos (category_id);
CREATE INDEX idx_combos_status         ON combos (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_combos_is_active      ON combos (is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_combos_is_featured    ON combos (is_featured) WHERE deleted_at IS NULL;
CREATE INDEX idx_combos_time_slot      ON combos (time_slot) WHERE deleted_at IS NULL;
CREATE INDEX idx_combos_display_order  ON combos (display_priority DESC, id ASC);
CREATE INDEX idx_combos_deleted_at     ON combos (deleted_at) WHERE deleted_at IS NOT NULL;

COMMENT ON TABLE  combos                     IS 'B&B meal combos – bundles of menu items sold at a discounted price.';
COMMENT ON COLUMN combos.savings_amount      IS 'Auto-computed: original_price - combo_price.';
COMMENT ON COLUMN combos.savings_percentage  IS 'Computed and stored by application on create/update.';
COMMENT ON COLUMN combos.version             IS 'Hibernate optimistic-locking version counter.';

-- ---------------------------------------------------------------------------
-- 2. combo_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS combo_items (
    id           BIGSERIAL   PRIMARY KEY,
    combo_id     BIGINT      NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
    menu_item_id BIGINT      NOT NULL REFERENCES menu_item(id) ON DELETE RESTRICT,
    quantity     INTEGER     NOT NULL DEFAULT 1,
    sort_order   INTEGER     NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_combo_items_item UNIQUE (combo_id, menu_item_id),
    CONSTRAINT chk_combo_item_qty CHECK (quantity > 0)
);

CREATE INDEX idx_combo_items_combo    ON combo_items (combo_id);
CREATE INDEX idx_combo_items_menuitem ON combo_items (menu_item_id);

-- ---------------------------------------------------------------------------
-- 3. combo_schedule
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS combo_schedule (
    id          BIGSERIAL    PRIMARY KEY,
    combo_id    BIGINT       NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
    day_of_week SMALLINT     NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- ISO: 1=Mon
    start_time  TIME         NOT NULL,
    end_time    TIME         NOT NULL,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_combo_schedule_day UNIQUE (combo_id, day_of_week),
    CONSTRAINT chk_schedule_times CHECK (end_time > start_time)
);

CREATE INDEX idx_combo_schedule_combo ON combo_schedule (combo_id);
CREATE INDEX idx_combo_schedule_day   ON combo_schedule (day_of_week) WHERE is_active = TRUE;

-- ---------------------------------------------------------------------------
-- 4. combo_signature_products
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS combo_signature_products (
    id                   BIGSERIAL   PRIMARY KEY,
    combo_id             BIGINT      NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
    signature_product_id BIGINT      NOT NULL,   -- FK added after signature_products table is created in V31
    quantity             INTEGER     NOT NULL DEFAULT 1,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_combo_sig_product UNIQUE (combo_id, signature_product_id),
    CONSTRAINT chk_sig_qty CHECK (quantity > 0)
);

CREATE INDEX idx_combo_sig_combo   ON combo_signature_products (combo_id);
CREATE INDEX idx_combo_sig_product ON combo_signature_products (signature_product_id);

-- ---------------------------------------------------------------------------
-- 5. combo_analytics_daily
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS combo_analytics_daily (
    id                  BIGSERIAL      PRIMARY KEY,
    combo_id            BIGINT         NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
    business_date       DATE           NOT NULL,
    total_orders        INTEGER        NOT NULL DEFAULT 0,
    total_revenue       NUMERIC(12,2)  NOT NULL DEFAULT 0,
    total_savings_given NUMERIC(12,2)  NOT NULL DEFAULT 0,
    avg_order_value     NUMERIC(10,2),
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_combo_analytics_date UNIQUE (combo_id, business_date)
);

CREATE INDEX idx_combo_analytics_combo ON combo_analytics_daily (combo_id);
CREATE INDEX idx_combo_analytics_date  ON combo_analytics_daily (business_date DESC);

-- updated_at trigger
CREATE OR REPLACE FUNCTION combo_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER trg_combos_updated_at
    BEFORE UPDATE ON combos
    FOR EACH ROW EXECUTE FUNCTION combo_set_updated_at();

CREATE TRIGGER trg_combo_analytics_updated_at
    BEFORE UPDATE ON combo_analytics_daily
    FOR EACH ROW EXECUTE FUNCTION combo_set_updated_at();

