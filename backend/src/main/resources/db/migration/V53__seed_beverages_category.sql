-- =============================================================================
-- Seed: Beverages Category + Coke, Pepsi, Sprite
-- Version     : V53
-- Date        : 2026-06-08
-- Description : Inserts the "Beverages" category and three standard cold-drink
--               menu items (Coke, Pepsi, Sprite) if they do not already exist.
--               All statements are idempotent (ON CONFLICT DO NOTHING).
-- =============================================================================

-- ── 1. Insert Beverages category ─────────────────────────────────────────────
INSERT INTO category (name, description, is_deleted)
VALUES ('Beverages', 'Cold drinks and refreshments', false)
ON CONFLICT (name) DO NOTHING;

-- ── 2. Insert menu items ──────────────────────────────────────────────────────
-- We use a DO block so we can look up the category id once and reuse it,
-- and skip any item whose name already exists in the same category.
DO $$
DECLARE
    v_cat_id   BIGINT;
    v_coke_id  BIGINT;
    v_pepsi_id BIGINT;
    v_sprite_id BIGINT;
BEGIN
    -- Resolve category id
    SELECT id INTO v_cat_id FROM category WHERE name = 'Beverages' AND is_deleted = false;

    IF v_cat_id IS NULL THEN
        RAISE EXCEPTION 'Beverages category not found';
    END IF;

    -- ── Coke ──────────────────────────────────────────────────────────────────
    INSERT INTO menu_item (
        name, description, category_id,
        is_veg, recommended, available,
        fulfillment_type, inventory_mode,
        is_hidden, is_deleted,
        created_at, updated_at
    )
    SELECT
        'Coke',
        'Chilled Coca-Cola 300ml can. The classic taste.',
        v_cat_id,
        true, false, true,
        'SELF_PREPARED', 'UNLIMITED',
        false, false,
        NOW(), NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM menu_item
        WHERE name = 'Coke' AND category_id = v_cat_id AND is_deleted = false
    )
    RETURNING id INTO v_coke_id;

    IF v_coke_id IS NOT NULL THEN
        INSERT INTO menu_item_selling_price_history
            (menu_item_id, selling_price, effective_from, effective_to, reason, created_at)
        VALUES (v_coke_id, 60.00, NOW(), NULL, 'Initial seed price', NOW());
    END IF;

    -- ── Pepsi ─────────────────────────────────────────────────────────────────
    INSERT INTO menu_item (
        name, description, category_id,
        is_veg, recommended, available,
        fulfillment_type, inventory_mode,
        is_hidden, is_deleted,
        created_at, updated_at
    )
    SELECT
        'Pepsi',
        'Chilled Pepsi 300ml can. Bold and refreshing.',
        v_cat_id,
        true, false, true,
        'SELF_PREPARED', 'UNLIMITED',
        false, false,
        NOW(), NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM menu_item
        WHERE name = 'Pepsi' AND category_id = v_cat_id AND is_deleted = false
    )
    RETURNING id INTO v_pepsi_id;

    IF v_pepsi_id IS NOT NULL THEN
        INSERT INTO menu_item_selling_price_history
            (menu_item_id, selling_price, effective_from, effective_to, reason, created_at)
        VALUES (v_pepsi_id, 60.00, NOW(), NULL, 'Initial seed price', NOW());
    END IF;

    -- ── Sprite ────────────────────────────────────────────────────────────────
    INSERT INTO menu_item (
        name, description, category_id,
        is_veg, recommended, available,
        fulfillment_type, inventory_mode,
        is_hidden, is_deleted,
        created_at, updated_at
    )
    SELECT
        'Sprite',
        'Chilled Sprite 300ml can. Crisp lemon-lime refreshment.',
        v_cat_id,
        true, false, true,
        'SELF_PREPARED', 'UNLIMITED',
        false, false,
        NOW(), NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM menu_item
        WHERE name = 'Sprite' AND category_id = v_cat_id AND is_deleted = false
    )
    RETURNING id INTO v_sprite_id;

    IF v_sprite_id IS NOT NULL THEN
        INSERT INTO menu_item_selling_price_history
            (menu_item_id, selling_price, effective_from, effective_to, reason, created_at)
        VALUES (v_sprite_id, 60.00, NOW(), NULL, 'Initial seed price', NOW());
    END IF;

END $$;

