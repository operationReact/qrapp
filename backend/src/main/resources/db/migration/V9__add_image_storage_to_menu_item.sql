-- V9__add_image_storage_to_menu_item.sql
-- Add BLOB storage columns for menu item images

-- =========================================================
-- ADD IMAGE STORAGE COLUMNS TO MENU_ITEM TABLE
-- =========================================================

-- Add image_data column to store uploaded image as LONGBLOB
-- V9__add_image_storage_to_menu_item.sql

ALTER TABLE menu_item
    ADD COLUMN image_data BYTEA;

ALTER TABLE menu_item
    ADD COLUMN image_mime_type VARCHAR(100);
-- =========================================================
-- DOCUMENTATION
-- =========================================================
-- image_data: Stores binary image data (LONGBLOB)
--   - Max size: ~4GB per image (MySQL LONGBLOB)
--   - Typical usage: 1-5MB per image
--   - For ~200 images: ~200MB-1GB total
--
-- image_mime_type: Stores MIME type for proper HTTP Content-Type header
--   - Examples: "image/jpeg", "image/png", "image/webp", "image/gif"
--   - Used when serving images via GET /menu/{id}/image endpoint
--   - Defaults to "image/jpeg" if not set
--
-- Related fields:
--   - imageUrl: Existing column for external image URLs (unchanged)
--   - These new columns enable database storage as alternative to external URLs
--
-- =========================================================
-- PERFORMANCE NOTES
-- =========================================================
-- 1. LONGBLOB queries are slower than file system access
--    Solution: Use Spring @Cacheable(cacheNames = "menuItemImages")
--
-- 2. Database size impact: ~200 images * 1-5MB = ~200MB-1GB
--    Solution: Acceptable for development; migrate to S3/Cloud for 500+ images
--
-- 3. No index needed on LONGBLOB columns (not searchable)
--    Images retrieved by menu_item.id (already indexed)
--
-- =========================================================
-- MIGRATION STRATEGY
-- =========================================================
-- Forward (adding columns):
--   - NULL allowed: Can add columns without data
--   - No data loss: Existing imageUrl field unchanged
--   - Optional: Only used when images uploaded
--
-- Backward (if needed):
--   - DROP COLUMN image_data;
--   - DROP COLUMN image_mime_type;
--
-- =========================================================

