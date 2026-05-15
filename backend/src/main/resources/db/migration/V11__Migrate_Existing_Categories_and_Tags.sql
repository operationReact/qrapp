-- Migration Script: Migrate Existing String Categories and Tags to Foreign Keys (PostgreSQL)
-- Version: 2.0
-- Date: 2026-05-15
-- Description: Migrates existing string-based category and tag data to the new entity relationships

-- ============================================================================
-- IMPORTANT: Run this script ONLY AFTER V10__Create_Category_and_Tag_Tables.sql
-- ============================================================================

-- ============================================================================
-- Step 1: Migrate Categories from String to Foreign Key
-- ============================================================================
-- Extract unique categories from existing menu_item.category string column
-- Insert them into the category table (if not already present)
-- Update menu_item.category_id with the corresponding category ID

INSERT INTO category (name, description)
SELECT DISTINCT menu_item.category,
       'Auto-migrated category from existing data'
FROM menu_item
WHERE menu_item.category IS NOT NULL
  AND menu_item.category != ''
  AND menu_item.category NOT IN (SELECT name FROM category)
ON CONFLICT (name) DO NOTHING;

-- Update the category_id foreign key column
UPDATE menu_item m
SET category_id = (
    SELECT c.id FROM category c WHERE c.name = m.category
)
WHERE m.category IS NOT NULL
  AND m.category != ''
  AND m.category_id IS NULL;

-- ============================================================================
-- Step 2: Migrate Tags from String to Foreign Key
-- ============================================================================
-- Insert any missing tags from the existing data
INSERT INTO tag (name)
SELECT DISTINCT menu_item.tag
FROM menu_item
WHERE menu_item.tag IS NOT NULL
  AND menu_item.tag != ''
  AND menu_item.tag NOT IN (SELECT name FROM tag)
ON CONFLICT (name) DO NOTHING;

-- Update the tag_id foreign key column
UPDATE menu_item m
SET tag_id = (
    SELECT t.id FROM tag t WHERE t.name = m.tag
)
WHERE m.tag IS NOT NULL
  AND m.tag != ''
  AND m.tag_id IS NULL;

