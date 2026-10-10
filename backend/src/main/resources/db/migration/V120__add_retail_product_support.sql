ALTER TABLE menu_item
    ADD COLUMN IF NOT EXISTS product_type VARCHAR(40) NOT NULL DEFAULT 'PREPARED_FOOD',
    ADD COLUMN IF NOT EXISTS barcode VARCHAR(64),
    ADD COLUMN IF NOT EXISTS mrp NUMERIC(19,2),
    ADD COLUMN IF NOT EXISTS purchase_cost NUMERIC(19,2);

UPDATE menu_item
SET product_type = 'PREPARED_FOOD'
WHERE product_type IS NULL;

ALTER TABLE menu_item
    ADD CONSTRAINT chk_menu_item_retail_money
    CHECK (
        product_type <> 'RETAIL_PRODUCT'
        OR (mrp IS NOT NULL AND mrp > 0 AND purchase_cost IS NOT NULL AND purchase_cost >= 0)
    );

CREATE INDEX IF NOT EXISTS idx_menu_item_location_product_type
    ON menu_item(location_id, product_type, is_deleted, is_hidden);

CREATE UNIQUE INDEX IF NOT EXISTS uq_menu_item_location_barcode
    ON menu_item(location_id, barcode)
    WHERE barcode IS NOT NULL AND is_deleted = false;
