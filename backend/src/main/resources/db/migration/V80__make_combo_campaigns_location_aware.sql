-- Make Build-Your-Own-Combo (BYOC) campaigns location-owned so the admin surface
-- can be scoped by location while SUPER_ADMIN retains the cross-location ("All
-- Locations") view.
--
-- Strategy (safe, non-destructive — no fabricated data):
--   1. Add a location_id column.
--   2. Backfill each campaign from its own eligibility allow-list, which already
--      references location-owned data:
--        a. Prefer the dominant location of its eligible MENU ITEMS
--           (combo_campaign_eligibility.menu_item_id -> menu_item.location_id).
--        b. Else the dominant location of its eligible CATEGORIES
--           (combo_campaign_eligibility.category_id -> category.location_id).
--        c. Else fall back to the canonical PRAGATI_NAGAR location — accurate
--           because PRAGATI_NAGAR was the only real location before multi-location
--           existed (V71/V72/V74). Campaigns with an empty allow-list ("all items
--           qualify") legitimately have no per-row source, so this fallback owns them.
--      Dominant location is chosen defensively (most references win, ties by id).
--   3. Enforce NOT NULL + FK once every row owns a location.
--   4. Add a covering index tuned for location-filtered admin reads.

DO $$
DECLARE
    pragati_nagar_id BIGINT;
BEGIN
    SELECT id INTO pragati_nagar_id
    FROM locations
    WHERE code = 'PRAGATI_NAGAR';

    IF pragati_nagar_id IS NULL THEN
        RAISE EXCEPTION 'PRAGATI_NAGAR location is required to backfill combo campaign location';
    END IF;

    ALTER TABLE combo_campaigns ADD COLUMN IF NOT EXISTS location_id BIGINT;

    UPDATE combo_campaigns c
    SET location_id = COALESCE(
        -- a. dominant eligible menu-item location
        (SELECT mi.location_id
         FROM combo_campaign_eligibility e
         JOIN menu_item mi ON mi.id = e.menu_item_id
         WHERE e.campaign_id = c.id AND e.menu_item_id IS NOT NULL
         GROUP BY mi.location_id
         ORDER BY COUNT(*) DESC, mi.location_id ASC
         LIMIT 1),
        -- b. dominant eligible category location
        (SELECT cat.location_id
         FROM combo_campaign_eligibility e
         JOIN category cat ON cat.id = e.category_id
         WHERE e.campaign_id = c.id AND e.category_id IS NOT NULL
         GROUP BY cat.location_id
         ORDER BY COUNT(*) DESC, cat.location_id ASC
         LIMIT 1),
        -- c. canonical fallback
        pragati_nagar_id)
    WHERE c.location_id IS NULL;
END $$;

ALTER TABLE combo_campaigns ALTER COLUMN location_id SET NOT NULL;

ALTER TABLE combo_campaigns
    DROP CONSTRAINT IF EXISTS fk_combo_campaigns_location;
ALTER TABLE combo_campaigns
    ADD CONSTRAINT fk_combo_campaigns_location
    FOREIGN KEY (location_id) REFERENCES locations(id);

CREATE INDEX IF NOT EXISTS idx_combo_campaigns_location
    ON combo_campaigns (location_id);

CREATE INDEX IF NOT EXISTS idx_combo_campaigns_location_deleted_priority
    ON combo_campaigns (location_id, deleted_at, display_priority DESC);

COMMENT ON COLUMN combo_campaigns.location_id
    IS 'Owning location (derived from the campaign''s eligible menu-item / category location; PRAGATI_NAGAR fallback for empty allow-lists). New rows set explicitly by the admin API.';
