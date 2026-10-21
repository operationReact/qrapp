-- Addon option groups (e.g. "Extra cheese", "Size") managed per location.
-- A group is attached to any number of menu items; a single group may be shared.
CREATE TABLE IF NOT EXISTS addon_group (
    id            BIGSERIAL    PRIMARY KEY,
    location_id   BIGINT       NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    name          VARCHAR(120) NOT NULL,
    min_select    INTEGER      NOT NULL DEFAULT 0,
    max_select    INTEGER      NOT NULL DEFAULT 1,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    display_order INTEGER      NOT NULL DEFAULT 0,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_addon_group_select CHECK (min_select >= 0 AND max_select >= 1 AND min_select <= max_select)
);

CREATE INDEX IF NOT EXISTS idx_addon_group_location ON addon_group (location_id);

CREATE TABLE IF NOT EXISTS addon_option (
    id            BIGSERIAL     PRIMARY KEY,
    group_id      BIGINT        NOT NULL REFERENCES addon_group(id) ON DELETE CASCADE,
    name          VARCHAR(120)  NOT NULL,
    price_delta   NUMERIC(10,2) NOT NULL DEFAULT 0,
    is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
    display_order INTEGER       NOT NULL DEFAULT 0,
    created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_addon_option_price CHECK (price_delta >= 0)
);

CREATE INDEX IF NOT EXISTS idx_addon_option_group ON addon_option (group_id);

CREATE TABLE IF NOT EXISTS menu_item_addon_group (
    id            BIGSERIAL PRIMARY KEY,
    menu_item_id  BIGINT    NOT NULL REFERENCES menu_item(id) ON DELETE CASCADE,
    addon_group_id BIGINT   NOT NULL REFERENCES addon_group(id) ON DELETE CASCADE,
    display_order INTEGER   NOT NULL DEFAULT 0,
    CONSTRAINT uq_menu_item_addon_group UNIQUE (menu_item_id, addon_group_id)
);
