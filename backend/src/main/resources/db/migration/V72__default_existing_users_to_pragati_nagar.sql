-- Keep every existing user on the canonical existing menu feed.

DO $$
DECLARE
    pragati_nagar_id BIGINT;
BEGIN
    SELECT id INTO pragati_nagar_id
    FROM locations
    WHERE code = 'PRAGATI_NAGAR'
      AND is_active = true;

    IF pragati_nagar_id IS NULL THEN
        RAISE EXCEPTION 'PRAGATI_NAGAR active location is required';
    END IF;

    UPDATE users
    SET default_location_id = pragati_nagar_id
    WHERE default_location_id IS NULL;
END $$;
