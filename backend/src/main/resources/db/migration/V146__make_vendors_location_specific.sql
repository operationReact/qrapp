-- Vendors (suppliers) become location-specific.
--
-- 1. Add a NULLABLE location_id so existing rows are preserved.
-- 2. Backfill from the location where the vendor's menu items are used (dominant location,
--    ties broken by id — same rule as V78 for vendor orders).
-- 3. Unused vendors fall back to the canonical PRAGATI_NAGAR location (V78 rationale).
-- 4. Add the FK + index. Application code always sets location_id for new vendors.

ALTER TABLE vendor ADD COLUMN IF NOT EXISTS location_id BIGINT;

WITH vendor_location AS (
    SELECT vendor_id, location_id
    FROM (
        SELECT mi.vendor_id AS vendor_id,
               mi.location_id AS location_id,
               ROW_NUMBER() OVER (
                   PARTITION BY mi.vendor_id
                   ORDER BY COUNT(*) DESC, mi.location_id ASC
               ) AS rn
        FROM menu_item mi
        WHERE mi.vendor_id IS NOT NULL AND mi.location_id IS NOT NULL
        GROUP BY mi.vendor_id, mi.location_id
    ) ranked
    WHERE rn = 1
)
UPDATE vendor v
SET location_id = vl.location_id
FROM vendor_location vl
WHERE v.id = vl.vendor_id
  AND v.location_id IS NULL;

UPDATE vendor
SET location_id = (SELECT id FROM locations WHERE code = 'PRAGATI_NAGAR')
WHERE location_id IS NULL
  AND EXISTS (SELECT 1 FROM locations WHERE code = 'PRAGATI_NAGAR');

ALTER TABLE vendor DROP CONSTRAINT IF EXISTS fk_vendor_location;
ALTER TABLE vendor
    ADD CONSTRAINT fk_vendor_location
    FOREIGN KEY (location_id) REFERENCES locations(id);

CREATE INDEX IF NOT EXISTS idx_vendor_location_name ON vendor (location_id, vendor_name);

COMMENT ON COLUMN vendor.location_id
    IS 'Owning location. Vendors are managed per location. NULLABLE only for legacy rows that could not be backfilled.';
