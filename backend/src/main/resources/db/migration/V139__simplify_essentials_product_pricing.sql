ALTER TABLE product_master
    ALTER COLUMN sku DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS cost_price NUMERIC(19,2) NOT NULL DEFAULT 0;

ALTER TABLE product_master
    DROP CONSTRAINT IF EXISTS chk_product_master_sku_nonblank;

ALTER TABLE product_master
    ADD CONSTRAINT chk_product_master_cost_price_nonnegative CHECK (cost_price >= 0);

UPDATE location_product lp
SET selling_price = pm.mrp
FROM product_master pm
WHERE lp.product_id = pm.id
  AND lp.selling_price IS DISTINCT FROM pm.mrp;
