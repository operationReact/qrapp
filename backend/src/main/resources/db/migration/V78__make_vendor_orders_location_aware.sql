-- Make vendor (procurement) orders location-owned so the admin vendor-order surface
-- can be scoped by location while SUPER_ADMIN retains the cross-location ("All
-- Locations") view.
--
-- Strategy (safe, non-destructive — no fabricated data):
--   1. Add a NULLABLE location_id column so existing rows are preserved.
--   2. Backfill each vendor order from the location of its own ordered menu items
--      (vendor_order_item -> menu_item.location_id). When an order mixes locations
--      the location contributing the most line items wins, ties broken by id — the
--      same dominant-location rule V74 uses for customer orders.
--   3. Orphan orders (no items / unresolved item location) fall back to the
--      canonical PRAGATI_NAGAR location (V71/V72/V74 rationale).
--   4. Add the FK + a covering index. The column stays NULLABLE on purpose so a
--      future order that somehow lacks items can never break creation; application
--      code sets the location for freshly created orders.

ALTER TABLE vendor_order ADD COLUMN IF NOT EXISTS location_id BIGINT;

-- 2. Backfill from the order's own items (dominant location per order).
WITH order_location AS (
    SELECT vendor_order_id, location_id
    FROM (
        SELECT voi.vendor_order_id AS vendor_order_id,
               mi.location_id      AS location_id,
               ROW_NUMBER() OVER (
                   PARTITION BY voi.vendor_order_id
                   ORDER BY COUNT(*) DESC, mi.location_id ASC
               ) AS rn
        FROM vendor_order_item voi
        JOIN menu_item mi ON mi.id = voi.menu_item_id
        WHERE mi.location_id IS NOT NULL
        GROUP BY voi.vendor_order_id, mi.location_id
    ) ranked
    WHERE rn = 1
)
UPDATE vendor_order o
SET location_id = ol.location_id
FROM order_location ol
WHERE o.id = ol.vendor_order_id
  AND o.location_id IS NULL;

-- 3. Fallback for orphan orders (no items / unresolved item location).
UPDATE vendor_order
SET location_id = (SELECT id FROM locations WHERE code = 'PRAGATI_NAGAR')
WHERE location_id IS NULL
  AND EXISTS (SELECT 1 FROM locations WHERE code = 'PRAGATI_NAGAR');

-- 4. Referential integrity + query performance.
ALTER TABLE vendor_order
    DROP CONSTRAINT IF EXISTS fk_vendor_order_location;
ALTER TABLE vendor_order
    ADD CONSTRAINT fk_vendor_order_location
    FOREIGN KEY (location_id) REFERENCES locations(id);

CREATE INDEX IF NOT EXISTS idx_vendor_order_location
    ON vendor_order (location_id);

CREATE INDEX IF NOT EXISTS idx_vendor_order_location_status_created
    ON vendor_order (location_id, status, created_at DESC);

COMMENT ON COLUMN vendor_order.location_id
    IS 'Owning location (derived from the ordered menu items'' location). NULLABLE to preserve legacy rows and never block creation.';
