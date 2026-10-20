UPDATE product_master SET is_veg = TRUE WHERE is_veg IS NULL;

ALTER TABLE product_master ALTER COLUMN is_veg SET DEFAULT TRUE;
ALTER TABLE product_master ALTER COLUMN is_veg SET NOT NULL;
