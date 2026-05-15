-- Migration Script: Create Category and Tag Tables (PostgreSQL)
-- Version: 1.0
-- Date: 2026-05-15
-- Description: Creates new Category and Tag entities and updates MenuItem table to use foreign keys

-- ============================================================================
-- Step 1: Create Category Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS category (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT
);

CREATE INDEX IF NOT EXISTS idx_category_name ON category(name);

-- ============================================================================
-- Step 2: Create Tag Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS tag (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_tag_name ON tag(name);

-- ============================================================================
-- Step 3: Add Foreign Key Columns to MenuItem Table
-- ============================================================================
ALTER TABLE menu_item
ADD COLUMN IF NOT EXISTS category_id BIGINT,
ADD COLUMN IF NOT EXISTS tag_id BIGINT;

-- ============================================================================
-- Step 4: Add Foreign Key Constraints
-- ============================================================================
-- Drop existing constraints if they exist (for idempotency)
ALTER TABLE menu_item
DROP CONSTRAINT IF EXISTS fk_menu_item_category;

ALTER TABLE menu_item
DROP CONSTRAINT IF EXISTS fk_menu_item_tag;

-- Add new foreign key constraints
ALTER TABLE menu_item
ADD CONSTRAINT fk_menu_item_category
    FOREIGN KEY (category_id) REFERENCES category(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE menu_item
ADD CONSTRAINT fk_menu_item_tag
    FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- Step 5: Create Indexes for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_menu_item_category_id ON menu_item(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_tag_id ON menu_item(tag_id);

-- ============================================================================
-- Step 6: Seed Default Categories (if not already present)
-- ============================================================================
INSERT INTO category (name, description) VALUES
('Breakfast Specials', 'Healthy breakfast options to start your day'),
('Lunch Meals', 'Full meal combinations for lunch'),
('Sandwiches', 'Variety of delicious sandwiches'),
('Maggi Corner', 'Instant noodle dishes'),
('Fresh & Healthy Bowls', 'Nutritious bowl options'),
('Dosa Corner', 'South Indian dosa varieties'),
('Sides', 'Side dishes and extras')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- Step 7: Seed Default Tags (if not already present)
-- ============================================================================
INSERT INTO tag (name) VALUES
('Spicy'),
('Mild'),
('Sweet'),
('Savory'),
('Premium')
ON CONFLICT (name) DO NOTHING;

