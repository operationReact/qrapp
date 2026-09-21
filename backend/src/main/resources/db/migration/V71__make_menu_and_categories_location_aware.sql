-- Make menu and category data location-owned.

INSERT INTO locations (code, name, is_active)
VALUES
    ('PRAGATI_NAGAR', 'Pragati Nagar', true),
    ('MEENAKSHI_TOWERS', 'Meenakshi Towers', true),
    ('MINDSPACE', 'Mindspace', true)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    is_active = true;

DO $$
DECLARE
    pragati_nagar_id BIGINT;
BEGIN
    SELECT id INTO pragati_nagar_id
    FROM locations
    WHERE code = 'PRAGATI_NAGAR';

    IF pragati_nagar_id IS NULL THEN
        RAISE EXCEPTION 'PRAGATI_NAGAR location could not be created';
    END IF;

    -- Existing data has the explicitly approved ownership: Pragati Nagar.
    ALTER TABLE category ADD COLUMN IF NOT EXISTS location_id BIGINT;
    ALTER TABLE menu_item ADD COLUMN IF NOT EXISTS location_id BIGINT;

    UPDATE category
    SET location_id = pragati_nagar_id
    WHERE location_id IS NULL;

    UPDATE menu_item
    SET location_id = pragati_nagar_id
    WHERE location_id IS NULL;

    IF EXISTS (SELECT 1 FROM category WHERE location_id IS NULL)
       OR EXISTS (SELECT 1 FROM menu_item WHERE location_id IS NULL) THEN
        RAISE EXCEPTION 'Menu or category rows remain without a location';
    END IF;

    -- DEFAULT was only the Phase 1 bootstrap location. Preserve user records
    -- while moving their default/access references to the canonical location.
    UPDATE users
    SET default_location_id = pragati_nagar_id
    WHERE default_location_id = (
        SELECT id FROM locations WHERE code = 'DEFAULT'
    );

    INSERT INTO user_location_access (user_id, location_id, active)
    SELECT user_id, pragati_nagar_id, active
    FROM user_location_access
    WHERE location_id = (SELECT id FROM locations WHERE code = 'DEFAULT')
    ON CONFLICT (user_id, location_id) DO UPDATE
    SET active = EXCLUDED.active;

    DELETE FROM user_location_access
    WHERE location_id = (SELECT id FROM locations WHERE code = 'DEFAULT');

    DELETE FROM locations
    WHERE code = 'DEFAULT';
END $$;

ALTER TABLE category
    DROP CONSTRAINT IF EXISTS category_name_key;

ALTER TABLE category
    DROP CONSTRAINT IF EXISTS uq_category_name;

ALTER TABLE category
    ALTER COLUMN location_id SET NOT NULL;

ALTER TABLE menu_item
    ALTER COLUMN location_id SET NOT NULL;

ALTER TABLE category
    ADD CONSTRAINT fk_category_location
    FOREIGN KEY (location_id) REFERENCES locations(id);

ALTER TABLE menu_item
    ADD CONSTRAINT fk_menu_item_location
    FOREIGN KEY (location_id) REFERENCES locations(id);

ALTER TABLE category
    ADD CONSTRAINT uq_category_location_id_id UNIQUE (location_id, id);

ALTER TABLE category
    ADD CONSTRAINT uq_category_location_name UNIQUE (location_id, name);

ALTER TABLE menu_item
    ADD CONSTRAINT fk_menu_item_category_same_location
    FOREIGN KEY (location_id, category_id)
    REFERENCES category (location_id, id)
    ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS idx_category_location_deleted_name
    ON category (location_id, is_deleted, name);

CREATE INDEX IF NOT EXISTS idx_menu_item_location_deleted_category
    ON menu_item (location_id, is_deleted, is_hidden, category_id);

CREATE INDEX IF NOT EXISTS idx_menu_item_location_available_recommended
    ON menu_item (location_id, available, recommended);
