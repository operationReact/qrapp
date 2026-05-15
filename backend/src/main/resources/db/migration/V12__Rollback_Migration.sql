-- Rollback Migration Script: Revert Category and Tag Changes (PostgreSQL)
-- Version: 1.0 (Rollback for V11)
-- Date: 2026-05-15
-- Description: Rolls back the migration of categories and tags from foreign keys back to string columns

-- ============================================================================
-- IMPORTANT: This script reverts V11__Migrate_Existing_Categories_and_Tags.sql
-- Do NOT run this unless you need to rollback the migration
-- ============================================================================

-- ============================================================================
-- Step 1: Restore String Values to menu_item Table
-- ============================================================================
-- Populate the old string columns from the foreign key references

UPDATE menu_item m
SET category = (
    SELECT c.name FROM category c WHERE c.id = m.category_id
)
WHERE m.category_id IS NOT NULL;

UPDATE menu_item m
SET tag = (
    SELECT t.name FROM tag t WHERE t.id = m.tag_id
)
WHERE m.tag_id IS NOT NULL;

