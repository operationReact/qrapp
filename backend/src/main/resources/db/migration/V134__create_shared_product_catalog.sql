-- Shared Essentials catalog. Legacy menu_item/inventory rows are deliberately
-- retained; the catalog is introduced additively so existing checkout and
-- invoice snapshots remain untouched.
CREATE TABLE IF NOT EXISTS product_master (
    id BIGSERIAL PRIMARY KEY,
    sku VARCHAR(80) NOT NULL,
    variant_identity VARCHAR(120) NOT NULL DEFAULT 'DEFAULT',
    name VARCHAR(200) NOT NULL,
    description TEXT,
    mrp NUMERIC(19,2) NOT NULL,
    tax_profile_id BIGINT REFERENCES tax_profile(id),
    hsn_sac VARCHAR(20),
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_product_master_sku_variant UNIQUE (sku, variant_identity),
    CONSTRAINT chk_product_master_mrp_positive CHECK (mrp >= 0),
    CONSTRAINT chk_product_master_sku_nonblank CHECK (length(trim(sku)) > 0),
    CONSTRAINT chk_product_master_variant_nonblank CHECK (length(trim(variant_identity)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_product_master_active ON product_master(is_active, name);

CREATE TABLE IF NOT EXISTS location_product (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES product_master(id),
    location_id BIGINT NOT NULL REFERENCES locations(id),
    selling_price NUMERIC(19,2) NOT NULL,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_location_product_product_location UNIQUE (product_id, location_id),
    CONSTRAINT chk_location_product_price_nonnegative CHECK (selling_price >= 0)
);

CREATE INDEX IF NOT EXISTS idx_location_product_location_visible
    ON location_product(location_id, is_visible, is_available);

CREATE TABLE IF NOT EXISTS product_inventory (
    id BIGSERIAL PRIMARY KEY,
    location_product_id BIGINT NOT NULL UNIQUE REFERENCES location_product(id),
    available_quantity BIGINT NOT NULL DEFAULT 0,
    reserved_quantity BIGINT NOT NULL DEFAULT 0,
    low_stock_threshold BIGINT NOT NULL DEFAULT 5,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_product_inventory_available_nonnegative CHECK (available_quantity >= 0),
    CONSTRAINT chk_product_inventory_reserved_nonnegative CHECK (reserved_quantity >= 0),
    CONSTRAINT chk_product_inventory_threshold_nonnegative CHECK (low_stock_threshold >= 0)
);

CREATE TABLE IF NOT EXISTS product_inventory_movement (
    id BIGSERIAL PRIMARY KEY,
    location_product_id BIGINT NOT NULL REFERENCES location_product(id),
    movement_type VARCHAR(30) NOT NULL,
    quantity_delta BIGINT NOT NULL,
    quantity_before BIGINT NOT NULL,
    quantity_after BIGINT NOT NULL,
    reason VARCHAR(512),
    reference_id VARCHAR(120),
    changed_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_product_movement_delta_nonzero CHECK (quantity_delta <> 0),
    CONSTRAINT chk_product_movement_after_nonnegative CHECK (quantity_after >= 0)
);

CREATE INDEX IF NOT EXISTS idx_product_movement_location_product_created
    ON product_inventory_movement(location_product_id, created_at DESC);
