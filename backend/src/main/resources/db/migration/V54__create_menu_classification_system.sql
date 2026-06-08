-- =============================================================================
-- 3-DIMENSION MENU CLASSIFICATION SYSTEM
-- Version     : V54
-- Date        : 2026-06-09
-- Description : Implements the three classification dimensions required by the
--               Recommendation Engine, Meal Recommendation Engine, Combo Builder,
--               and Upselling Engine:
--
--   Dimension 1 – Combo Role (already exists as bundle_combo_role; rename & add description)
--   Dimension 2 – Meal Type  (new: meal_type + item_meal_type)
--   Dimension 3 – Cuisine Type (new: cuisine_type + item_cuisine_type)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- DIMENSION 1: COMBO ROLE – extend existing bundle_combo_role table
-- ─────────────────────────────────────────────────────────────────────────────

-- Add description column (nullable for backwards compat)
ALTER TABLE bundle_combo_role
    ADD COLUMN IF NOT EXISTS description TEXT;

-- Rename Main → Primary and Side → Accompaniment to align with new spec.
-- ON CONFLICT DO NOTHING guards idempotent re-runs.
UPDATE bundle_combo_role SET name = 'Primary',        description = 'The central dish of the meal (e.g. Biryani, Dosa)'
WHERE name = 'Main';

UPDATE bundle_combo_role SET name = 'Accompaniment',  description = 'Sides that complement the primary dish (e.g. Raita, Chutney)'
WHERE name = 'Side';

UPDATE bundle_combo_role SET description = 'Beverages served with the meal (e.g. Tea, Coffee, Coke)'
WHERE name = 'Drink' AND description IS NULL;

UPDATE bundle_combo_role SET description = 'Sweet finish to the meal (e.g. Ice Cream, Gulab Jamun)'
WHERE name = 'Dessert' AND description IS NULL;

UPDATE bundle_combo_role SET description = 'Optional extras or customisations (e.g. Extra Cheese, Extra Chutney)'
WHERE name = 'Addon' AND description IS NULL;

-- Insert any missing roles (idempotent)
INSERT INTO bundle_combo_role (name, description, display_order, is_active)
VALUES
    ('Primary',       'The central dish of the meal (e.g. Biryani, Dosa)',             0, true),
    ('Accompaniment', 'Sides that complement the primary dish (e.g. Raita, Chutney)',  1, true),
    ('Drink',         'Beverages served with the meal (e.g. Tea, Coffee, Coke)',        2, true),
    ('Dessert',       'Sweet finish to the meal (e.g. Ice Cream, Gulab Jamun)',         3, true),
    ('Addon',         'Optional extras or customisations (e.g. Extra Cheese)',          4, true)
ON CONFLICT (name) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- DIMENSION 2: MEAL TYPE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meal_type (
    id            BIGSERIAL    PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    description   TEXT,
    display_order INTEGER      NOT NULL DEFAULT 0,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_meal_type_name UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_meal_type_active_order ON meal_type (is_active, display_order);

COMMENT ON TABLE  meal_type               IS 'Defines when a menu item is typically consumed (Breakfast, Lunch, Dinner, Snack, Anytime).';
COMMENT ON COLUMN meal_type.display_order IS 'Ascending sort key for UI dropdowns and output.';
COMMENT ON COLUMN meal_type.is_active     IS 'Soft-disable: inactive types are hidden from admin UI.';

-- Seed standard meal types
INSERT INTO meal_type (name, description, display_order, is_active)
VALUES
    ('Breakfast', 'Items typically consumed in the morning',                           0, true),
    ('Lunch',     'Items typically consumed at midday',                                1, true),
    ('Dinner',    'Items typically consumed in the evening',                           2, true),
    ('Snack',     'Light bites consumed between meals',                                3, true),
    ('Anytime',   'Items suitable for consumption at any time of day (e.g. desserts)', 4, true)
ON CONFLICT (name) DO NOTHING;

-- Junction table: MenuItem ↔ MealType (many-to-many)
CREATE TABLE IF NOT EXISTS item_meal_type (
    item_id      BIGINT      NOT NULL REFERENCES menu_item(id) ON DELETE CASCADE,
    meal_type_id BIGINT      NOT NULL REFERENCES meal_type(id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (item_id, meal_type_id)
);

CREATE INDEX IF NOT EXISTS idx_imt_meal_type ON item_meal_type (meal_type_id);

COMMENT ON TABLE item_meal_type IS 'Many-to-many: assigns one or more MealType(s) to a MenuItem.';

-- ─────────────────────────────────────────────────────────────────────────────
-- DIMENSION 3: CUISINE TYPE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cuisine_type (
    id            BIGSERIAL    PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    description   TEXT,
    display_order INTEGER      NOT NULL DEFAULT 0,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cuisine_type_name UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_cuisine_type_active_order ON cuisine_type (is_active, display_order);

COMMENT ON TABLE  cuisine_type               IS 'Defines the food style or cuisine of a menu item.';
COMMENT ON COLUMN cuisine_type.display_order IS 'Ascending sort key for UI dropdowns.';
COMMENT ON COLUMN cuisine_type.is_active     IS 'Soft-disable: inactive cuisines are hidden from admin UI.';

-- Seed standard cuisine types
INSERT INTO cuisine_type (name, description, display_order, is_active)
VALUES
    ('SouthIndian',  'South Indian cuisine (Dosa, Idli, Vada, Sambar, etc.)',         0, true),
    ('NorthIndian',  'North Indian cuisine (Biryani, Roti, Paneer, Dal, etc.)',        1, true),
    ('Chinese',      'Chinese and Indo-Chinese cuisine (Noodles, Fried Rice, etc.)',   2, true),
    ('Italian',      'Italian cuisine (Pizza, Pasta, Garlic Bread, etc.)',             3, true),
    ('FastFood',     'Fast food items (Burger, Fries, Sandwich, Wraps, etc.)',         4, true),
    ('Bakery',       'Bakery items (Bread, Cakes, Cookies, Pastries, etc.)',           5, true),
    ('Beverage',     'Beverages (Tea, Coffee, Juices, Cold drinks, etc.)',             6, true),
    ('Desserts',     'Desserts and sweets (Ice Cream, Halwa, Gulab Jamun, etc.)',      7, true)
ON CONFLICT (name) DO NOTHING;

-- Junction table: MenuItem ↔ CuisineType (many-to-many)
CREATE TABLE IF NOT EXISTS item_cuisine_type (
    item_id         BIGINT      NOT NULL REFERENCES menu_item(id) ON DELETE CASCADE,
    cuisine_type_id BIGINT      NOT NULL REFERENCES cuisine_type(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (item_id, cuisine_type_id)
);

CREATE INDEX IF NOT EXISTS idx_ict_cuisine_type ON item_cuisine_type (cuisine_type_id);

COMMENT ON TABLE item_cuisine_type IS 'Many-to-many: assigns one or more CuisineType(s) to a MenuItem.';

