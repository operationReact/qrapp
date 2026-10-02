-- Hall of Happiness 2.0: unify CUSTOMER, PARTY/EVENT and ADMIN_CURATED memories
-- into one gallery while preserving existing party-order-linked customer uploads.

ALTER TABLE hall_of_happiness_photos
    ALTER COLUMN party_order_id DROP NOT NULL;

ALTER TABLE hall_of_happiness_photos
    ALTER COLUMN customer_id DROP NOT NULL;

ALTER TABLE hall_of_happiness_photos
    ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER';

ALTER TABLE hall_of_happiness_photos
    ADD COLUMN IF NOT EXISTS location_id BIGINT NULL;

ALTER TABLE hall_of_happiness_photos
    ADD COLUMN IF NOT EXISTS is_global BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE hall_of_happiness_photos
    ADD COLUMN IF NOT EXISTS event_label VARCHAR(160) NULL;

ALTER TABLE hall_of_happiness_photos
    ADD COLUMN IF NOT EXISTS description VARCHAR(500) NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint constraint_row
        JOIN pg_class source_table
            ON source_table.oid = constraint_row.conrelid
        JOIN pg_class target_table
            ON target_table.oid = constraint_row.confrelid
        WHERE constraint_row.contype = 'f'
          AND source_table.relname = 'hall_of_happiness_photos'
          AND target_table.relname = 'locations'
          AND constraint_row.conkey = ARRAY[
              (SELECT attnum
               FROM pg_attribute
               WHERE attrelid = source_table.oid
                 AND attname = 'location_id')
          ]::smallint[]
    ) THEN
        ALTER TABLE hall_of_happiness_photos
            ADD CONSTRAINT fk_hall_of_happiness_photos_location
            FOREIGN KEY (location_id) REFERENCES locations(id);
    END IF;
END $$;

-- Backfill location_id for existing (party-order-linked) rows so the feed can be
-- filtered by a single location_id column without always joining party_order.
UPDATE hall_of_happiness_photos photo
SET location_id = party_order.location_id
FROM party_orders party_order
WHERE photo.party_order_id = party_order.id
  AND photo.location_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_hall_photo_source_type
    ON hall_of_happiness_photos (source_type);
CREATE INDEX IF NOT EXISTS idx_hall_photo_location
    ON hall_of_happiness_photos (location_id);
CREATE INDEX IF NOT EXISTS idx_hall_photo_global
    ON hall_of_happiness_photos (is_global);
