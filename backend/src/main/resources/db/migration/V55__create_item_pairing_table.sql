-- =============================================================================
-- ITEM PAIRING TABLE
-- Version     : V55
-- Date        : 2026-06-09
-- Description : Creates the item_pairing table for explicit item→item pairings
--               with role classification (Drink, Side, Dessert, Addon) and
--               priority-based ordering.
--
--   item_pairing — admin-defined pairings:
--     "Chicken Biryani → [Coke (DRINK), Raita (SIDE), Gulab Jamun (DESSERT)]"
--
-- Replaces the old meal-roles bulk-assignment approach with a richer,
-- directional, prioritised pairing model.
-- =============================================================================

CREATE TABLE IF NOT EXISTS item_pairing (
    id              BIGSERIAL    PRIMARY KEY,
    source_item_id  BIGINT       NOT NULL REFERENCES menu_item(id) ON DELETE CASCADE,
    target_item_id  BIGINT       NOT NULL REFERENCES menu_item(id) ON DELETE CASCADE,
    pairing_role    VARCHAR(20)  NOT NULL,
    priority        INTEGER      NOT NULL DEFAULT 0,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by      VARCHAR(100),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_item_pairing       UNIQUE  (source_item_id, target_item_id),
    CONSTRAINT chk_no_self_pairing   CHECK   (source_item_id <> target_item_id),
    CONSTRAINT chk_pairing_role      CHECK   (pairing_role IN ('DRINK','SIDE','DESSERT','ADDON'))
);

CREATE INDEX IF NOT EXISTS idx_ip_source_active_priority
    ON item_pairing (source_item_id, is_active, priority DESC);

CREATE INDEX IF NOT EXISTS idx_ip_target
    ON item_pairing (target_item_id);

COMMENT ON TABLE  item_pairing               IS 'Admin-defined directional item pairings with role and priority.';
COMMENT ON COLUMN item_pairing.source_item_id IS 'The item the customer has (e.g. Chicken Biryani).';
COMMENT ON COLUMN item_pairing.target_item_id IS 'The item being recommended (e.g. Coke).';
COMMENT ON COLUMN item_pairing.pairing_role   IS 'Role the target plays: DRINK | SIDE | DESSERT | ADDON.';
COMMENT ON COLUMN item_pairing.priority       IS 'Higher value = shown first. Pairings sorted DESC by priority.';
COMMENT ON COLUMN item_pairing.is_active      IS 'Soft-disable without deleting the pairing.';

