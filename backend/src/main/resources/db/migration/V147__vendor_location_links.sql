-- A vendor (supplier) is one global identity keyed by phone number. It can be linked to
-- several locations, so the same vendor can be reused by another location's admin
-- instead of being recreated (which the globally unique phone would reject anyway).

CREATE TABLE IF NOT EXISTS vendor_location (
    id          BIGSERIAL PRIMARY KEY,
    vendor_id   BIGINT    NOT NULL REFERENCES vendor (id) ON DELETE CASCADE,
    location_id BIGINT    NOT NULL REFERENCES locations (id),
    is_active   BOOLEAN   NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_vendor_location UNIQUE (vendor_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_vendor_location_location ON vendor_location (location_id, is_active);

-- Carry over the links created by V146 (one per vendor). Active flag moves to the link.
INSERT INTO vendor_location (vendor_id, location_id, is_active, created_at)
SELECT v.id, v.location_id, COALESCE(v.is_active, TRUE), COALESCE(v.created_at, NOW())
FROM vendor v
WHERE v.location_id IS NOT NULL
ON CONFLICT (vendor_id, location_id) DO NOTHING;

DROP INDEX IF EXISTS idx_vendor_location_name;
ALTER TABLE vendor DROP CONSTRAINT IF EXISTS fk_vendor_location;
ALTER TABLE vendor DROP COLUMN IF EXISTS location_id;
ALTER TABLE vendor DROP COLUMN IF EXISTS is_active;
