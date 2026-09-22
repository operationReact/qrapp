-- Make the pre-aggregated analytics snapshot tables location-aware so the admin
-- dashboard can scope every KPI/report by location while SUPER_ADMIN retains the
-- cross-location ("All Locations") view.
--
-- Strategy (safe, non-destructive — no fabricated data):
--   1. Add a location_id dimension to each order-derived aggregate table.
--   2. Backfill existing snapshot rows to PRAGATI_NAGAR. This is accurate, not a
--      guess: every historical order/menu row was assigned to PRAGATI_NAGAR by
--      V71/V72/V74 (it was the only real location before multi-location existed),
--      so all pre-existing aggregate rows belong to it.
--   3. Replace the date-only unique constraints with composite keys that include
--      location_id so the schedulers can upsert one row per (period, location).
--   4. Add FK + covering indexes tuned for location-filtered dashboard reads.
--
-- The schedulers re-aggregate from the live `orders` table (which is already
-- location-owned via V74), so location-correct history is reproduced by a normal
-- backfill — no risky historical reconstruction is required.

DO $$
DECLARE
    pragati_nagar_id BIGINT;
BEGIN
    SELECT id INTO pragati_nagar_id
    FROM locations
    WHERE code = 'PRAGATI_NAGAR';

    IF pragati_nagar_id IS NULL THEN
        RAISE EXCEPTION 'PRAGATI_NAGAR location is required to backfill analytics location dimension';
    END IF;

    -- 1. analytics_daily_sales -------------------------------------------------
    ALTER TABLE analytics_daily_sales ADD COLUMN IF NOT EXISTS location_id BIGINT;
    UPDATE analytics_daily_sales SET location_id = pragati_nagar_id WHERE location_id IS NULL;

    -- 2. analytics_hourly_orders -----------------------------------------------
    ALTER TABLE analytics_hourly_orders ADD COLUMN IF NOT EXISTS location_id BIGINT;
    UPDATE analytics_hourly_orders SET location_id = pragati_nagar_id WHERE location_id IS NULL;

    -- 3. analytics_menu_item ---------------------------------------------------
    ALTER TABLE analytics_menu_item ADD COLUMN IF NOT EXISTS location_id BIGINT;
    -- Prefer the item's own (authoritative) location; fall back to Pragati Nagar.
    UPDATE analytics_menu_item a
    SET location_id = COALESCE(
        (SELECT mi.location_id FROM menu_item mi WHERE mi.id = a.menu_item_id),
        pragati_nagar_id)
    WHERE a.location_id IS NULL;

    -- 4. analytics_coupon ------------------------------------------------------
    ALTER TABLE analytics_coupon ADD COLUMN IF NOT EXISTS location_id BIGINT;
    UPDATE analytics_coupon SET location_id = pragati_nagar_id WHERE location_id IS NULL;
END $$;

-- ── NOT NULL + FK + unique swap: analytics_daily_sales ───────────────────────
ALTER TABLE analytics_daily_sales ALTER COLUMN location_id SET NOT NULL;
ALTER TABLE analytics_daily_sales DROP CONSTRAINT IF EXISTS uq_analytics_daily_sales_date;
ALTER TABLE analytics_daily_sales DROP CONSTRAINT IF EXISTS uq_analytics_daily_sales_date_location;
ALTER TABLE analytics_daily_sales
    ADD CONSTRAINT uq_analytics_daily_sales_date_location UNIQUE (sales_date, location_id);
ALTER TABLE analytics_daily_sales DROP CONSTRAINT IF EXISTS fk_ads_location;
ALTER TABLE analytics_daily_sales
    ADD CONSTRAINT fk_ads_location FOREIGN KEY (location_id) REFERENCES locations(id);
CREATE INDEX IF NOT EXISTS idx_ads_location_date
    ON analytics_daily_sales (location_id, sales_date DESC);

-- ── analytics_hourly_orders ──────────────────────────────────────────────────
ALTER TABLE analytics_hourly_orders ALTER COLUMN location_id SET NOT NULL;
ALTER TABLE analytics_hourly_orders DROP CONSTRAINT IF EXISTS uq_analytics_hourly_orders_date_hour;
ALTER TABLE analytics_hourly_orders DROP CONSTRAINT IF EXISTS uq_analytics_hourly_orders_date_hour_location;
ALTER TABLE analytics_hourly_orders
    ADD CONSTRAINT uq_analytics_hourly_orders_date_hour_location
    UNIQUE (order_date, hour_of_day, location_id);
ALTER TABLE analytics_hourly_orders DROP CONSTRAINT IF EXISTS fk_aho_location;
ALTER TABLE analytics_hourly_orders
    ADD CONSTRAINT fk_aho_location FOREIGN KEY (location_id) REFERENCES locations(id);
CREATE INDEX IF NOT EXISTS idx_aho_location_date_hour
    ON analytics_hourly_orders (location_id, order_date, hour_of_day);

-- ── analytics_menu_item ──────────────────────────────────────────────────────
ALTER TABLE analytics_menu_item ALTER COLUMN location_id SET NOT NULL;
ALTER TABLE analytics_menu_item DROP CONSTRAINT IF EXISTS uq_analytics_menu_item_date;
ALTER TABLE analytics_menu_item DROP CONSTRAINT IF EXISTS uq_analytics_menu_item_date_location;
ALTER TABLE analytics_menu_item
    ADD CONSTRAINT uq_analytics_menu_item_date_location
    UNIQUE (menu_item_id, snapshot_date, location_id);
ALTER TABLE analytics_menu_item DROP CONSTRAINT IF EXISTS fk_ami_location;
ALTER TABLE analytics_menu_item
    ADD CONSTRAINT fk_ami_location FOREIGN KEY (location_id) REFERENCES locations(id);
CREATE INDEX IF NOT EXISTS idx_ami_location_date
    ON analytics_menu_item (location_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_ami_location_revenue
    ON analytics_menu_item (location_id, total_revenue DESC);

-- ── analytics_coupon ─────────────────────────────────────────────────────────
ALTER TABLE analytics_coupon ALTER COLUMN location_id SET NOT NULL;
ALTER TABLE analytics_coupon DROP CONSTRAINT IF EXISTS uq_analytics_coupon_code_date;
ALTER TABLE analytics_coupon DROP CONSTRAINT IF EXISTS uq_analytics_coupon_code_date_location;
ALTER TABLE analytics_coupon
    ADD CONSTRAINT uq_analytics_coupon_code_date_location
    UNIQUE (coupon_code, snapshot_date, location_id);
ALTER TABLE analytics_coupon DROP CONSTRAINT IF EXISTS fk_ac_location;
ALTER TABLE analytics_coupon
    ADD CONSTRAINT fk_ac_location FOREIGN KEY (location_id) REFERENCES locations(id);
CREATE INDEX IF NOT EXISTS idx_ac_location_date
    ON analytics_coupon (location_id, snapshot_date DESC);

COMMENT ON COLUMN analytics_daily_sales.location_id   IS 'Owning location. Snapshots are aggregated per (sales_date, location).';
COMMENT ON COLUMN analytics_hourly_orders.location_id IS 'Owning location. Buckets are aggregated per (order_date, hour_of_day, location).';
COMMENT ON COLUMN analytics_menu_item.location_id     IS 'Owning location (the menu item''s location). Snapshots are per (menu_item, snapshot_date, location).';
COMMENT ON COLUMN analytics_coupon.location_id        IS 'Location where the coupon was redeemed. Snapshots are per (coupon_code, snapshot_date, location).';
