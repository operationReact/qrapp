-- Make party (catering) orders location-owned so the admin party-order surface can
-- be scoped by location while SUPER_ADMIN retains the cross-location ("All
-- Locations") view.
--
-- Strategy (safe, non-destructive — no fabricated data):
--   1. Add a NULLABLE location_id column so existing rows are preserved.
--   2. Backfill each party order from the OWNING USER'S default location
--      (users.default_location_id via party_orders.user_id). This reuses existing,
--      explicitly-assigned location data — it is not a guess.
--   3. Orphan orders (no user / user without a default location) fall back to the
--      canonical PRAGATI_NAGAR location — accurate because PRAGATI_NAGAR was the
--      only real location before multi-location existed (V71/V72/V74).
--   4. Add the FK + a covering index. The column stays NULLABLE on purpose so a
--      future customer without a default location can never break party-order
--      creation; application code sets the location for freshly created orders.

ALTER TABLE party_orders ADD COLUMN IF NOT EXISTS location_id BIGINT;

-- 2. Backfill from the owning user's default location.
UPDATE party_orders po
SET location_id = u.default_location_id
FROM users u
WHERE po.user_id = u.id
  AND po.location_id IS NULL
  AND u.default_location_id IS NOT NULL;

-- 3. Fallback for orphan orders (no user / user without a default location).
UPDATE party_orders
SET location_id = (SELECT id FROM locations WHERE code = 'PRAGATI_NAGAR')
WHERE location_id IS NULL
  AND EXISTS (SELECT 1 FROM locations WHERE code = 'PRAGATI_NAGAR');

-- 4. Referential integrity + query performance.
ALTER TABLE party_orders
    DROP CONSTRAINT IF EXISTS fk_party_orders_location;
ALTER TABLE party_orders
    ADD CONSTRAINT fk_party_orders_location
    FOREIGN KEY (location_id) REFERENCES locations(id);

CREATE INDEX IF NOT EXISTS idx_party_orders_location
    ON party_orders (location_id);

-- Composite index tuned for the admin list query that filters by location + status
-- and orders by creation time.
CREATE INDEX IF NOT EXISTS idx_party_orders_location_status_created
    ON party_orders (location_id, status, created_at DESC);

COMMENT ON COLUMN party_orders.location_id
    IS 'Owning location (derived from the requesting user''s default location). NULLABLE to preserve legacy rows and never block creation.';
