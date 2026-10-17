-- Category images share the content-addressed product_image_asset store.
-- Purely additive: existing categories keep their legacy image_url/image_key
-- and are only moved onto a shared asset when they are next uploaded or reused.
ALTER TABLE category ADD COLUMN IF NOT EXISTS image_asset_id BIGINT REFERENCES product_image_asset(id);

CREATE INDEX IF NOT EXISTS idx_category_image_asset ON category(image_asset_id);
