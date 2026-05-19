-- V24: Add sku_code column to menu_item for bulk upload identification
-- This column is optional (nullable) and unique when set.

ALTER TABLE menu_item
    ADD COLUMN IF NOT EXISTS sku_code VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_item_sku_code
    ON menu_item (sku_code)
    WHERE sku_code IS NOT NULL;

