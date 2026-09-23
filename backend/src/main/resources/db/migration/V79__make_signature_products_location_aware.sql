-- Make B&B Signature Products location-owned so the admin catalogue can be scoped
-- by location while SUPER_ADMIN retains the cross-location ("All Locations") view.
--
-- Strategy (safe, non-destructive — no fabricated data):
--   1. Add a location_id column.
--   2. Backfill every existing product to the canonical PRAGATI_NAGAR location.
--      Unlike orders/combos, signature products carry NO relational link to
--      menu/location data (they are standalone private-label items), so there is no
--      per-row source to derive from. Attributing pre-existing rows to PRAGATI_NAGAR
--      is accurate rather than a guess: it was the only real location before
--      multi-location existed (V71/V72/V74), so all pre-existing catalogue rows
--      belong to it. New products are assigned a location explicitly by the admin
--      UI/API going forward.
--   3. Enforce NOT NULL + FK once every row owns a location.
--   4. Add covering indexes tuned for location-filtered catalogue reads.

DO $$
DECLARE
    pragati_nagar_id BIGINT;
BEGIN
    SELECT id INTO pragati_nagar_id
    FROM locations
    WHERE code = 'PRAGATI_NAGAR';

    IF pragati_nagar_id IS NULL THEN
        RAISE EXCEPTION 'PRAGATI_NAGAR location is required to backfill signature product location';
    END IF;

    ALTER TABLE signature_products ADD COLUMN IF NOT EXISTS location_id BIGINT;

    UPDATE signature_products
    SET location_id = pragati_nagar_id
    WHERE location_id IS NULL;
END $$;

ALTER TABLE signature_products ALTER COLUMN location_id SET NOT NULL;

ALTER TABLE signature_products
    DROP CONSTRAINT IF EXISTS fk_signature_products_location;
ALTER TABLE signature_products
    ADD CONSTRAINT fk_signature_products_location
    FOREIGN KEY (location_id) REFERENCES locations(id);

CREATE INDEX IF NOT EXISTS idx_signature_products_location
    ON signature_products (location_id);

CREATE INDEX IF NOT EXISTS idx_signature_products_location_deleted_priority
    ON signature_products (location_id, deleted_at, display_priority DESC);

COMMENT ON COLUMN signature_products.location_id
    IS 'Owning location. Existing rows backfilled to PRAGATI_NAGAR (the only real location pre multi-location); new rows set explicitly by the admin API.';
