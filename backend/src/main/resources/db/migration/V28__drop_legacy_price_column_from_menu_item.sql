-- ============================================================
-- V28 : Drop orphaned `price` column from menu_item
--
-- The `price` column was part of the original schema but was
-- superseded by `menu_item_selling_price_history` in V23.
-- V23 dropped `base_price` and `margin` but accidentally left
-- the original `price` column in place. Because no JPA entity
-- field maps to this column, Hibernate excludes it from INSERT
-- statements, causing a NOT NULL constraint violation whenever
-- a new menu item is created (e.g. via bulk upload).
--
-- This migration drops the column cleanly. All pricing data is
-- now held exclusively in menu_item_selling_price_history.
-- Idempotent – safe to re-run.
-- ============================================================

ALTER TABLE menu_item
    DROP COLUMN IF EXISTS price;

