-- =============================================================================
-- V103__add_category_image_fields.sql
-- Enhances the Category model with an optional rich food image (manual upload
-- or admin-accepted AI generation) and an explicit display order, while
-- keeping the existing client-side icon resolver as the automatic fallback
-- when no image has been set yet.
-- =============================================================================

ALTER TABLE category
    ADD COLUMN IF NOT EXISTS image_url          TEXT,
    ADD COLUMN IF NOT EXISTS image_key          TEXT,
    ADD COLUMN IF NOT EXISTS display_order      INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ai_generated_image BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_category_location_order
    ON category (location_id, display_order);

COMMENT ON COLUMN category.image_url IS
    'Optional premium food-photography image. When null the frontend falls back to the existing heuristic icon resolver.';
COMMENT ON COLUMN category.ai_generated_image IS
    'TRUE when image_url was produced by the admin-triggered AI generation flow (never generated at customer request time).';
