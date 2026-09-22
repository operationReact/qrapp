-- Make the pre-aggregated combo analytics snapshot table location-aware so the
-- admin dashboard can scope combo KPIs by location while SUPER_ADMIN retains the
-- cross-location ("All Locations") view.
--
-- Strategy (safe, non-destructive — no fabricated data):
--   1. Add a location_id dimension to combo_analytics_daily.
--   2. Backfill each existing snapshot row from the combo's real menu-item
--      location. A combo is composed of menu_items that all belong to a single
--      location (enforced by ComboServiceImpl.validateItems /
--      ComboRepository.findActiveByIdAndLocation), so combo_items -> menu_item
--      -> menu_item.location_id is the authoritative owner. We pick the dominant
--      item location defensively (in case of legacy mixed data) and fall back to
--      PRAGATI_NAGAR for any combo with no surviving items — accurate because
--      PRAGATI_NAGAR was the only real location before multi-location existed
--      (V71/V72/V74).
--   3. Replace the (combo_id, business_date) unique key with a composite key that
--      includes location_id so aggregation can upsert one row per
--      (combo, day, location).
--   4. Add FK + a covering index tuned for location-filtered dashboard reads.

DO $$
DECLARE
    pragati_nagar_id BIGINT;
BEGIN
    SELECT id INTO pragati_nagar_id
    FROM locations
    WHERE code = 'PRAGATI_NAGAR';

    IF pragati_nagar_id IS NULL THEN
        RAISE EXCEPTION 'PRAGATI_NAGAR location is required to backfill combo analytics location dimension';
    END IF;

    ALTER TABLE combo_analytics_daily ADD COLUMN IF NOT EXISTS location_id BIGINT;

    -- Prefer the combo's own (authoritative) menu-item location; pick the
    -- dominant one for robustness, then fall back to Pragati Nagar.
    UPDATE combo_analytics_daily cad
    SET location_id = COALESCE(
        (SELECT mi.location_id
         FROM combo_items ci
         JOIN menu_item mi ON mi.id = ci.menu_item_id
         WHERE ci.combo_id = cad.combo_id
         GROUP BY mi.location_id
         ORDER BY COUNT(*) DESC, mi.location_id ASC
         LIMIT 1),
        pragati_nagar_id)
    WHERE cad.location_id IS NULL;
END $$;

-- ── NOT NULL + unique swap + FK + index ──────────────────────────────────────
ALTER TABLE combo_analytics_daily ALTER COLUMN location_id SET NOT NULL;

ALTER TABLE combo_analytics_daily DROP CONSTRAINT IF EXISTS uq_combo_analytics_date;
ALTER TABLE combo_analytics_daily DROP CONSTRAINT IF EXISTS uq_combo_analytics_date_location;
ALTER TABLE combo_analytics_daily
    ADD CONSTRAINT uq_combo_analytics_date_location
    UNIQUE (combo_id, business_date, location_id);

ALTER TABLE combo_analytics_daily DROP CONSTRAINT IF EXISTS fk_combo_analytics_location;
ALTER TABLE combo_analytics_daily
    ADD CONSTRAINT fk_combo_analytics_location
    FOREIGN KEY (location_id) REFERENCES locations(id);

CREATE INDEX IF NOT EXISTS idx_combo_analytics_location_date
    ON combo_analytics_daily (location_id, business_date DESC);

COMMENT ON COLUMN combo_analytics_daily.location_id
    IS 'Owning location (derived from the combo''s menu-item location). Snapshots are per (combo, business_date, location).';
