-- Catalog products use the existing MenuItem/order/cart IDs through a
-- projection.  A nullable FK keeps all legacy menu rows valid.
ALTER TABLE menu_item ADD COLUMN IF NOT EXISTS product_id BIGINT;
ALTER TABLE product_master ADD COLUMN IF NOT EXISTS brand VARCHAR(120);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_menu_item_product_master'
    ) THEN
        ALTER TABLE menu_item
            ADD CONSTRAINT fk_menu_item_product_master
            FOREIGN KEY (product_id) REFERENCES product_master(id);
    END IF;
END $$;

-- Reuse existing retail MenuItem rows rather than duplicating their identity.
UPDATE menu_item mi
SET product_id = p.id
FROM product_master p
WHERE mi.product_id IS NULL
  AND mi.product_type = 'RETAIL_PRODUCT'
  AND p.variant_identity = 'DEFAULT'
  AND p.sku = upper(COALESCE(NULLIF(trim(mi.sku_code), ''), 'LEGACY-' || mi.id::text));

CREATE INDEX IF NOT EXISTS idx_menu_item_product_location
    ON menu_item(product_id, location_id);

-- The application canonicalises SKU/variant to upper case, and this index
-- closes the race where two requests arrive before either is committed.
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_master_sku_variant_ci
    ON product_master (lower(sku), lower(variant_identity));
