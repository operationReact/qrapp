-- ============================================================
-- V23 : Enterprise Pricing & Procurement Refactor
-- Fully idempotent – safe to re-run after partial failures.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Add fulfillment_type to menu_item (safe if already exists)
-- ────────────────────────────────────────────────────────────
ALTER TABLE menu_item
    ADD COLUMN IF NOT EXISTS fulfillment_type VARCHAR(30) NOT NULL DEFAULT 'SELF_PREPARED';

-- ────────────────────────────────────────────────────────────
-- 2. Create selling price history table
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_item_selling_price_history (
    id             BIGSERIAL PRIMARY KEY,
    menu_item_id   BIGINT        NOT NULL REFERENCES menu_item(id) ON DELETE RESTRICT,
    selling_price  NUMERIC(19,2) NOT NULL,
    effective_from TIMESTAMPTZ   NOT NULL,
    effective_to   TIMESTAMPTZ,
    reason         VARCHAR(500),
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_misprice_item_from
    ON menu_item_selling_price_history (menu_item_id, effective_from);

CREATE INDEX IF NOT EXISTS idx_misprice_active
    ON menu_item_selling_price_history (menu_item_id, effective_to)
    WHERE effective_to IS NULL;

-- ────────────────────────────────────────────────────────────
-- 3. Seed selling price history ONLY if base_price still exists
--    (guards against re-runs after partial failure)
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'menu_item'
          AND column_name  = 'base_price'
    ) THEN
        INSERT INTO menu_item_selling_price_history
            (menu_item_id, selling_price, effective_from, effective_to, reason, created_at)
        SELECT
            id,
            COALESCE(base_price, 0) + COALESCE(margin, 0),
            NOW(),
            NULL,
            'Migrated from legacy base_price + margin columns',
            NOW()
        FROM menu_item
        WHERE COALESCE(base_price, 0) + COALESCE(margin, 0) > 0
          -- skip items already seeded in a previous partial run
          AND id NOT IN (SELECT DISTINCT menu_item_id FROM menu_item_selling_price_history);
    END IF;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 4. Drop legacy pricing columns (safe if already dropped)
-- ────────────────────────────────────────────────────────────
ALTER TABLE menu_item
    DROP COLUMN IF EXISTS base_price,
    DROP COLUMN IF EXISTS margin;

-- ────────────────────────────────────────────────────────────
-- 5. Create vendor cost history table
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendor_menu_item_cost_history (
    id             BIGSERIAL PRIMARY KEY,
    shop_id        BIGINT        NOT NULL REFERENCES shop(id) ON DELETE RESTRICT,
    menu_item_id   BIGINT        NOT NULL REFERENCES menu_item(id) ON DELETE RESTRICT,
    cost_price     NUMERIC(19,2) NOT NULL,
    effective_from TIMESTAMPTZ   NOT NULL,
    effective_to   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendorcost_shop_item_from
    ON vendor_menu_item_cost_history (shop_id, menu_item_id, effective_from);

CREATE INDEX IF NOT EXISTS idx_vendorcost_active
    ON vendor_menu_item_cost_history (shop_id, menu_item_id, effective_to)
    WHERE effective_to IS NULL;

CREATE INDEX IF NOT EXISTS idx_vendorcost_item
    ON vendor_menu_item_cost_history (menu_item_id);

-- ────────────────────────────────────────────────────────────
-- 6. Refactor shop_order_item
-- ────────────────────────────────────────────────────────────
ALTER TABLE shop_order_item
    DROP COLUMN IF EXISTS base_price_snapshot,
    DROP COLUMN IF EXISTS margin_snapshot,
    DROP COLUMN IF EXISTS selling_price_snapshot;

ALTER TABLE shop_order_item
    ADD COLUMN IF NOT EXISTS cost_price_snapshot NUMERIC(19,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS line_total           NUMERIC(19,2) NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name      = 'shop_order_item'
          AND constraint_name = 'fk_shoporderitem_menuitem'
    ) THEN
        ALTER TABLE shop_order_item
            ADD CONSTRAINT fk_shoporderitem_menuitem
            FOREIGN KEY (menu_item_id) REFERENCES menu_item(id) ON DELETE RESTRICT;
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_shoporderitem_order ON shop_order_item (shop_order_id);
CREATE INDEX IF NOT EXISTS idx_shoporderitem_item  ON shop_order_item (menu_item_id);

-- ────────────────────────────────────────────────────────────
-- 7. Refactor order_item – add immutable financial snapshot columns
-- ────────────────────────────────────────────────────────────
ALTER TABLE order_item
    ADD COLUMN IF NOT EXISTS selling_price_snapshot NUMERIC(19,2),
    ADD COLUMN IF NOT EXISTS cost_price_snapshot    NUMERIC(19,2),
    ADD COLUMN IF NOT EXISTS profit_snapshot        NUMERIC(19,2),
    ADD COLUMN IF NOT EXISTS line_total             NUMERIC(19,2),
    ADD COLUMN IF NOT EXISTS created_at             TIMESTAMPTZ;

UPDATE order_item SET created_at = NOW() WHERE created_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orderitem_order   ON order_item (order_id);
CREATE INDEX IF NOT EXISTS idx_orderitem_item    ON order_item (item_id);
CREATE INDEX IF NOT EXISTS idx_orderitem_created ON order_item (created_at);

-- ────────────────────────────────────────────────────────────
-- 8. Analytics indexes
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_misprice_range
    ON menu_item_selling_price_history (effective_from, effective_to);

CREATE INDEX IF NOT EXISTS idx_vendorcost_range
    ON vendor_menu_item_cost_history (effective_from, effective_to);

CREATE INDEX IF NOT EXISTS idx_orderitem_profit
    ON order_item (item_id, created_at, profit_snapshot);

