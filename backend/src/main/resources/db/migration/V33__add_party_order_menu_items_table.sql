-- V33__add_party_order_menu_items_table.sql
-- Introduces structured menu items for party orders.
-- Each item is a plain text tag (free-form, not linked to menu_item catalogue).
-- Backward-compatible: keeps menu_description column (now nullable) so existing
-- rows are not broken; the backfill below populates the new table from old data.

-- ── 1. Create party_order_menu_items ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS party_order_menu_items (
    id             BIGSERIAL    PRIMARY KEY,
    party_order_id BIGINT       NOT NULL
                                REFERENCES party_orders(id)
                                ON DELETE CASCADE,
    item_name      VARCHAR(255) NOT NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pomi_party_order_id
    ON party_order_menu_items (party_order_id);

-- ── 2. Make menu_description nullable (was NOT NULL) ─────────────────────────
ALTER TABLE party_orders
    ALTER COLUMN menu_description DROP NOT NULL;

-- ── 3. Backfill: split existing menu_description rows into menu items ─────────
-- Splits on comma, trims whitespace, skips empty tokens.
INSERT INTO party_order_menu_items (party_order_id, item_name)
SELECT
    po.id,
    TRIM(item_name_raw) AS item_name
FROM party_orders po
CROSS JOIN LATERAL unnest(
    string_to_array(po.menu_description, ',')
) AS item_name_raw
WHERE po.menu_description IS NOT NULL
  AND po.menu_description <> ''
  AND TRIM(item_name_raw) <> '';

-- ── 4. Extend the status CHECK constraint to include NEW and UNDER_REVIEW ─────
-- The status column is a VARCHAR(30) with a named CHECK constraint.
-- We drop the old constraint and add a new one that includes the extra values.
ALTER TABLE party_orders
    DROP CONSTRAINT IF EXISTS chk_party_status;

ALTER TABLE party_orders
    ADD CONSTRAINT chk_party_status CHECK (status IN (
        'NEW',
        'UNDER_REVIEW',
        'PENDING_ESTIMATE',
        'ESTIMATE_SENT',
        'CONFIRMED',
        'REJECTED',
        'CANCELLED',
        'COMPLETED'
    ));
