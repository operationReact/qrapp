-- MRP, cost price and category are set per location, so reused products can be priced locally.
ALTER TABLE location_product
    ADD COLUMN IF NOT EXISTS mrp NUMERIC(19, 2),
    ADD COLUMN IF NOT EXISTS cost_price NUMERIC(19, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS category_name VARCHAR(80);

UPDATE location_product lp
SET mrp = p.mrp,
    cost_price = p.cost_price,
    category_name = p.category_name
FROM product_master p
WHERE p.id = lp.product_id;

UPDATE location_product SET mrp = 0 WHERE mrp IS NULL;

ALTER TABLE location_product
    ALTER COLUMN mrp SET NOT NULL,
    ADD CONSTRAINT chk_location_product_mrp_nonnegative CHECK (mrp >= 0),
    ADD CONSTRAINT chk_location_product_cost_nonnegative CHECK (cost_price >= 0);

ALTER TABLE product_master
    DROP COLUMN IF EXISTS mrp,
    DROP COLUMN IF EXISTS cost_price,
    DROP COLUMN IF EXISTS category_name;
