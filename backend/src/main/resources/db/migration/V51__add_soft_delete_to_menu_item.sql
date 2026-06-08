-- =============================================================================
-- Soft Delete Support for MenuItem
-- Version     : V51
-- Date        : 2026-06-08
-- Description : Adds an is_deleted flag to menu_item so that DELETE operations
--               become soft-deletes. Deleted items are hidden from all public
--               and admin list endpoints while the row is preserved for
--               referential integrity with existing orders.
-- =============================================================================

ALTER TABLE menu_item
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN menu_item.is_deleted IS
    'Soft-delete flag. TRUE = item has been deleted by an admin but the row is '
    'retained for referential integrity. Deleted items are excluded from all '
    'menu queries and cannot be ordered.';

