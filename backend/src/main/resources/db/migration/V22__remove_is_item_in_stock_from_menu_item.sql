-- V22: Remove is_item_in_stock from menu_item
-- Stock availability is now derived at runtime:
--   UNLIMITED items → always orderable
--   LIMITED items   → orderable when inventory.available_quantity > 0

ALTER TABLE menu_item DROP COLUMN IF EXISTS is_item_in_stock;

