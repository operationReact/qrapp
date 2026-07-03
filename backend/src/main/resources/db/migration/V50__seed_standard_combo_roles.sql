-- =============================================================================
-- COMPLETE YOUR MEAL — Bundle Role Tables + Seed Standard Combo Roles
-- Version     : V50
-- Date        : 2026-06-08
-- Description : Creates the two tables required by the "Complete Your Meal"
--               recommendation feature and seeds the five standard meal roles.
--
--   bundle_combo_role       — named roles items can play in a meal bundle
--   bundle_item_combo_role  — many-to-many: MenuItem <-> ComboRole
-- =============================================================================

-- ── 1. BUNDLE_COMBO_ROLE ─────────────────────────────────────────────────────
-- Catalogue of roles (e.g. "Main", "Side", "Drink") used by the engine to
-- build balanced meal recommendations.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bundle_combo_role (
    id            BIGSERIAL    PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    display_order INTEGER      NOT NULL DEFAULT 0,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_bcr_name UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_bcr_active_order ON bundle_combo_role (is_active, display_order);

COMMENT ON TABLE  bundle_combo_role               IS 'Named roles a MenuItem can fulfil inside a Smart Bundle or Meal recommendation.';
COMMENT ON COLUMN bundle_combo_role.display_order IS 'Ascending sort key for role display in UI and bundle output.';
COMMENT ON COLUMN bundle_combo_role.is_active     IS 'Soft-disable: inactive roles are excluded from new meal generation.';

-- ── 2. BUNDLE_ITEM_COMBO_ROLE ────────────────────────────────────────────────
-- Junction table: assigns a menu item to one or more bundle roles.
-- Composite PK = (item_id, combo_role_id) — one row per item-role pair.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bundle_item_combo_role (
    item_id       BIGINT      NOT NULL REFERENCES menu_item(id)         ON DELETE CASCADE,
    combo_role_id BIGINT      NOT NULL REFERENCES bundle_combo_role(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (item_id, combo_role_id)
);

CREATE INDEX IF NOT EXISTS idx_bicr_role ON bundle_item_combo_role (combo_role_id);

COMMENT ON TABLE  bundle_item_combo_role IS 'Assigns menu items to named bundle/meal roles.';

-- ── 3. SEED STANDARD ROLES ───────────────────────────────────────────────────
-- INSERT ... ON CONFLICT DO NOTHING is idempotent (safe to re-run).
-- ----------------------------------------------------------------------------
INSERT INTO bundle_combo_role (name, display_order, is_active)
VALUES
    ('Main',    0, true),
    ('Side',    1, true),
    ('Drink',   2, true),
    ('Dessert', 3, true),
    ('Addon',   4, true)
ON CONFLICT (name) DO NOTHING;


