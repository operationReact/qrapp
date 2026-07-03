-- V42: Add pre-order support fields to the orders table
-- Adds: scheduled_at (datetime for when the order should be fulfilled)
--       pre_order (flag to identify pre-orders vs immediate orders)

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS pre_order    BOOLEAN NOT NULL DEFAULT FALSE;

-- Index to efficiently query upcoming pre-orders sorted by scheduled time
CREATE INDEX IF NOT EXISTS idx_orders_pre_order_scheduled_at
    ON orders (pre_order, scheduled_at)
    WHERE pre_order = TRUE;

-- Index to query pre-orders by status + scheduled time
CREATE INDEX IF NOT EXISTS idx_orders_pre_order_status_scheduled
    ON orders (pre_order, status, scheduled_at)
    WHERE pre_order = TRUE;

