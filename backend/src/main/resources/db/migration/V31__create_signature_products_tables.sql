-- =============================================================================
-- V31__create_signature_products_tables.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. signature_products
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS signature_products (
    id                       BIGSERIAL       PRIMARY KEY,
    product_name             VARCHAR(150)    NOT NULL,
    short_name               VARCHAR(60)     NOT NULL,
    description              TEXT,
    category                 VARCHAR(30)     NOT NULL DEFAULT 'OTHER',  -- SignatureProductCategory
    image_url                TEXT,
    selling_price            NUMERIC(10,2)   NOT NULL,
    procurement_price        NUMERIC(10,2),
    stock_quantity           INTEGER         NOT NULL DEFAULT 0,
    minimum_stock_threshold  INTEGER         NOT NULL DEFAULT 5,
    is_active                BOOLEAN         NOT NULL DEFAULT TRUE,
    is_featured              BOOLEAN         NOT NULL DEFAULT FALSE,
    is_combo_attachable      BOOLEAN         NOT NULL DEFAULT FALSE,
    display_priority         INTEGER         NOT NULL DEFAULT 0,
    vendor_name              VARCHAR(150),
    vendor_contact           VARCHAR(50),
    created_at               TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at               TIMESTAMPTZ,
    version                  BIGINT          NOT NULL DEFAULT 0,
    CONSTRAINT chk_sig_selling_price     CHECK (selling_price > 0),
    CONSTRAINT chk_sig_stock_non_neg     CHECK (stock_quantity >= 0),
    CONSTRAINT chk_sig_min_threshold     CHECK (minimum_stock_threshold >= 0)
);

CREATE INDEX idx_sig_products_active    ON signature_products (is_active)         WHERE deleted_at IS NULL;
CREATE INDEX idx_sig_products_featured  ON signature_products (is_featured)        WHERE deleted_at IS NULL;
CREATE INDEX idx_sig_products_attachable ON signature_products (is_combo_attachable) WHERE deleted_at IS NULL;
CREATE INDEX idx_sig_products_category  ON signature_products (category);
CREATE INDEX idx_sig_products_priority  ON signature_products (display_priority DESC);
CREATE INDEX idx_sig_products_deleted   ON signature_products (deleted_at)         WHERE deleted_at IS NOT NULL;

COMMENT ON TABLE  signature_products                   IS 'B&B private-label products (pickles, podis, snacks).';
COMMENT ON COLUMN signature_products.version           IS 'Hibernate optimistic-locking counter.';
COMMENT ON COLUMN signature_products.minimum_stock_threshold IS 'LOW_STOCK alert triggered when stock_quantity <= this value.';

-- ---------------------------------------------------------------------------
-- 2. signature_product_inventory_logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS signature_product_inventory_logs (
    id               BIGSERIAL       PRIMARY KEY,
    product_id       BIGINT          NOT NULL REFERENCES signature_products(id) ON DELETE CASCADE,
    operation_type   VARCHAR(20)     NOT NULL, -- SignatureInventoryOperation enum
    quantity         INTEGER         NOT NULL,
    before_quantity  INTEGER         NOT NULL,
    after_quantity   INTEGER         NOT NULL,
    remarks          TEXT,
    created_by       VARCHAR(100),
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_log_quantity CHECK (quantity != 0)
);

CREATE INDEX idx_sig_inv_logs_product ON signature_product_inventory_logs (product_id);
CREATE INDEX idx_sig_inv_logs_date    ON signature_product_inventory_logs (created_at DESC);
CREATE INDEX idx_sig_inv_logs_op      ON signature_product_inventory_logs (operation_type);

-- ---------------------------------------------------------------------------
-- 3. signature_product_analytics_daily
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS signature_product_analytics_daily (
    id               BIGSERIAL      PRIMARY KEY,
    product_id       BIGINT         NOT NULL REFERENCES signature_products(id) ON DELETE CASCADE,
    business_date    DATE           NOT NULL,
    total_orders     INTEGER        NOT NULL DEFAULT 0,
    total_revenue    NUMERIC(12,2)  NOT NULL DEFAULT 0,
    combo_attachments INTEGER       NOT NULL DEFAULT 0,
    standalone_sales INTEGER        NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sig_analytics_date UNIQUE (product_id, business_date)
);

CREATE INDEX idx_sig_analytics_product ON signature_product_analytics_daily (product_id);
CREATE INDEX idx_sig_analytics_date    ON signature_product_analytics_daily (business_date DESC);

-- Add FK from combo_signature_products -> signature_products (deferred from V30)
ALTER TABLE combo_signature_products
    ADD CONSTRAINT fk_combo_sig_product
    FOREIGN KEY (signature_product_id) REFERENCES signature_products(id) ON DELETE RESTRICT;

-- updated_at triggers
CREATE OR REPLACE FUNCTION sig_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER trg_sig_products_updated_at
    BEFORE UPDATE ON signature_products
    FOR EACH ROW EXECUTE FUNCTION sig_set_updated_at();

CREATE TRIGGER trg_sig_analytics_updated_at
    BEFORE UPDATE ON signature_product_analytics_daily
    FOR EACH ROW EXECUTE FUNCTION sig_set_updated_at();

