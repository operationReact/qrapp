-- Optional food type for MRP products: NULL = not specified, TRUE = veg, FALSE = non veg.
ALTER TABLE product_master ADD COLUMN IF NOT EXISTS is_veg BOOLEAN;
