-- =============================================================================
-- Soft Delete Support for Category
-- Version     : V52
-- Date        : 2026-06-08
-- Description : Adds an is_deleted flag to category so that DELETE operations
--               become soft-deletes. Deleted categories are hidden from all
--               public and admin list endpoints while the row is preserved for
--               referential integrity with existing menu items.
-- =============================================================================

ALTER TABLE category
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN category.is_deleted IS
    'Soft-delete flag. TRUE = category has been deleted by an admin but the row '
    'is retained for referential integrity with menu_item rows.';

