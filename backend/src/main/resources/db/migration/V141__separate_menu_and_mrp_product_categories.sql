ALTER TABLE category
    ADD COLUMN IF NOT EXISTS category_type VARCHAR(32) NOT NULL DEFAULT 'MENU';

ALTER TABLE category
    DROP CONSTRAINT IF EXISTS uq_category_location_name;

ALTER TABLE category
    ADD CONSTRAINT uq_category_location_name_type UNIQUE (location_id, name, category_type);

ALTER TABLE category
    ADD CONSTRAINT category_type_check
    CHECK (category_type IN ('MENU', 'MRP_PRODUCT'));

INSERT INTO category (
    name, location_id, is_deleted, display_order, ai_generated_image, category_type
)
SELECT DISTINCT
    p.category_name, lp.location_id, FALSE, 0, FALSE, 'MRP_PRODUCT'
FROM product_master p
JOIN location_product lp ON lp.product_id = p.id
WHERE p.category_name IS NOT NULL
  AND btrim(p.category_name) <> ''
ON CONFLICT (location_id, name, category_type) DO NOTHING;
