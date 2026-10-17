-- Content-addressed MRP product images. Purely additive: existing products keep
-- their legacy image_url/image_key and are not touched until they are re-uploaded.
CREATE TABLE IF NOT EXISTS product_image_asset (
    id BIGSERIAL PRIMARY KEY,
    content_sha256 VARCHAR(64) NOT NULL,
    image_url TEXT NOT NULL,
    image_key TEXT NOT NULL,
    content_type VARCHAR(40) NOT NULL,
    size_bytes BIGINT NOT NULL,
    ref_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_product_image_asset_sha UNIQUE (content_sha256),
    CONSTRAINT chk_product_image_asset_ref_count CHECK (ref_count >= 0),
    CONSTRAINT chk_product_image_asset_size CHECK (size_bytes > 0)
);

ALTER TABLE product_master ADD COLUMN IF NOT EXISTS image_asset_id BIGINT REFERENCES product_image_asset(id);

CREATE INDEX IF NOT EXISTS idx_product_master_image_asset ON product_master(image_asset_id);
CREATE INDEX IF NOT EXISTS idx_product_master_name_lower ON product_master (LOWER(name));
