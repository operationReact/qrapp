DO $$
DECLARE
    v_partner_id BIGINT;
    v_location_id BIGINT;
BEGIN
    IF current_database() !~* '(^|[_-])dev($|[_-])' THEN
        RETURN;
    END IF;

    INSERT INTO partner (
        partner_code, legal_name, display_name, status,
        primary_contact_name, primary_contact_email, primary_contact_phone,
        business_type, country, gst_registered, created_by, updated_by
    )
    VALUES (
        'URBANWRK', 'Urban Work (Development)', 'Urban Work', 'ACTIVE',
        'Development Contact', 'urbanwrk@example.test', '9999999999',
        'Development partner', 'India', FALSE, 'DEV_SEED', 'DEV_SEED'
    )
    ON CONFLICT (partner_code) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id INTO v_partner_id;

    SELECT id INTO v_location_id
    FROM locations
    WHERE is_active = TRUE
    ORDER BY id
    LIMIT 1;

    IF v_location_id IS NOT NULL
       AND NOT EXISTS (
           SELECT 1 FROM partner_location
           WHERE partner_id = v_partner_id AND location_id = v_location_id
             AND status = 'ACTIVE'
       )
       AND NOT EXISTS (
           SELECT 1 FROM partner_location
           WHERE location_id = v_location_id AND status = 'ACTIVE'
             AND relationship_type = 'PRIMARY'
       ) THEN
        INSERT INTO partner_location (
            partner_id, location_id, relationship_type, status,
            effective_from, created_by, updated_by
        )
        VALUES (v_partner_id, v_location_id, 'PRIMARY', 'ACTIVE',
                CURRENT_DATE, 'DEV_SEED', 'DEV_SEED');
    END IF;
END $$;
