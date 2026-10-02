-- Hall of Happiness 2.0: unify CUSTOMER, PARTY/EVENT and ADMIN_CURATED memories
-- into one gallery while preserving existing party-order-linked customer uploads.

ALTER TABLE hall_of_happiness_photos
    ALTER COLUMN party_order_id DROP NOT NULL;

ALTER TABLE hall_of_happiness_photos
    ALTER COLUMN customer_id DROP NOT NULL;

ALTER TABLE hall_of_happiness_photos
    ADD COLUMN source_type VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER',
    ADD COLUMN location_id BIGINT NULL REFERENCES locations(id),
    ADD COLUMN is_global BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN event_label VARCHAR(160) NULL,
    ADD COLUMN description VARCHAR(500) NULL;

-- Backfill location_id for existing (party-order-linked) rows so the feed can be
-- filtered by a single location_id column without always joining party_order.
UPDATE hall_of_happiness_photos photo
SET location_id = party_order.location_id
FROM party_orders party_order
WHERE photo.party_order_id = party_order.id
  AND photo.location_id IS NULL;

CREATE INDEX idx_hall_photo_source_type ON hall_of_happiness_photos (source_type);
CREATE INDEX idx_hall_photo_location ON hall_of_happiness_photos (location_id);
CREATE INDEX idx_hall_photo_global ON hall_of_happiness_photos (is_global);
