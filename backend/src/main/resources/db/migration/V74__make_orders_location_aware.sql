-- Make orders location-owned so the admin dashboard, live queue, pre-orders and
-- order analytics can be scoped by location.
--
-- Strategy (safe, non-destructive):
--   1. Add a NULLABLE location_id column so existing rows are preserved.
--   2. Backfill each order from the location of its own order_item -> menu_item.
--      When an order mixes locations (should not happen — carts are per-location),
--      the location contributing the most line items wins, ties broken by id.
--   3. Orphan orders that have no resolvable item location fall back to the
--      canonical PRAGATI_NAGAR location (the same fallback used for menu/category).
--   4. Add the FK and a covering index. The column stays NULLABLE on purpose so a
--      future order that somehow lacks items can never break checkout; application
--      code always sets the location for freshly created orders.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS location_id BIGINT;

-- 2. Backfill from the order's own items (dominant location per order).
WITH order_location AS (
    SELECT order_id, location_id
    FROM (
        SELECT oi.order_id AS order_id,
               mi.location_id AS location_id,
               ROW_NUMBER() OVER (
                   PARTITION BY oi.order_id
                   ORDER BY COUNT(*) DESC, mi.location_id ASC
               ) AS rn
        FROM order_item oi
        JOIN menu_item mi ON mi.id = oi.item_id
        WHERE mi.location_id IS NOT NULL
        GROUP BY oi.order_id, mi.location_id
    ) ranked
    WHERE rn = 1
)
UPDATE orders o
SET location_id = ol.location_id
FROM order_location ol
WHERE o.id = ol.order_id
  AND o.location_id IS NULL;

-- 3. Fallback for orphan orders (no items / unresolved item location).
UPDATE orders
SET location_id = (SELECT id FROM locations WHERE code = 'PRAGATI_NAGAR')
WHERE location_id IS NULL
  AND EXISTS (SELECT 1 FROM locations WHERE code = 'PRAGATI_NAGAR');

-- 4. Referential integrity + query performance.
ALTER TABLE orders
    DROP CONSTRAINT IF EXISTS fk_orders_location;
ALTER TABLE orders
    ADD CONSTRAINT fk_orders_location
    FOREIGN KEY (location_id) REFERENCES locations(id);

CREATE INDEX IF NOT EXISTS idx_orders_location
    ON orders (location_id);

-- Composite index tuned for the admin live-queue / dashboard queries that filter
-- by location + pre_order flag + status and order by creation time.
CREATE INDEX IF NOT EXISTS idx_orders_location_preorder_status
    ON orders (location_id, pre_order, status);
