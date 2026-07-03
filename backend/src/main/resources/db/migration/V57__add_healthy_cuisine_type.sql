-- =============================================================================
-- V57 – Add "Healthy" Cuisine Type
-- Date        : 2026-06-09
-- Description : Adds a dedicated "Healthy" cuisine type so items like
--               Fruit Bowl, Healthy Oat Meal, Salads, and Protein Shakes
--               can be classified separately from cuisine-origin types.
--
--               Existing types (SouthIndian … Desserts) are cuisine/origin-based.
--               "Healthy" is a food-category-based type — used for the
--               recommendation engine to surface health-conscious options.
-- =============================================================================

INSERT INTO cuisine_type (name, description, display_order, is_active)
VALUES (
    'Healthy',
    'Health-conscious items (Fruit Bowl, Salad, Oats, Protein Shake, etc.)',
    8,
    true
)
ON CONFLICT (name) DO NOTHING;

