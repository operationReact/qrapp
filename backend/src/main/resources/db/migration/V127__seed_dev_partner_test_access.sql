DO $$
DECLARE
    v_partner_id BIGINT;
    v_location_id BIGINT;
    v_user_id BIGINT;
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
    ON CONFLICT (partner_code) DO UPDATE
        SET status = 'ACTIVE', updated_by = 'DEV_SEED'
    RETURNING id INTO v_partner_id;

    SELECT id INTO v_location_id
    FROM locations
    WHERE is_active = TRUE
    ORDER BY id
    LIMIT 1;

    IF v_location_id IS NULL THEN
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM partner_location
        WHERE partner_id = v_partner_id
          AND location_id = v_location_id
          AND status = 'ACTIVE'
    ) THEN
        INSERT INTO partner_location (
            partner_id, location_id, relationship_type, status,
            effective_from, created_by, updated_by
        )
        VALUES (
            v_partner_id, v_location_id,
            CASE WHEN EXISTS (
                SELECT 1
                FROM partner_location
                WHERE location_id = v_location_id
                  AND status = 'ACTIVE'
                  AND relationship_type = 'PRIMARY'
            ) THEN 'SECONDARY' ELSE 'PRIMARY' END,
            'ACTIVE', CURRENT_DATE, 'DEV_SEED', 'DEV_SEED'
        );
    END IF;

    INSERT INTO users (
        phone, password, name, role, is_admin, is_super_user,
        default_location_id, terms_accepted, active, must_change_password
    )
    VALUES (
        '9000000099',
        '$2b$10$jHjjdW9lCVR.3H.KjaE/S.kwH66EPUFZpGswTPcfZjlXd9F9BXP6y',
        'Development Partner Admin', 'PARTNER_ADMIN', FALSE, FALSE,
        v_location_id, TRUE, TRUE, FALSE
    )
    ON CONFLICT (phone) DO UPDATE SET
        password = EXCLUDED.password,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        is_admin = FALSE,
        is_super_user = FALSE,
        default_location_id = EXCLUDED.default_location_id,
        terms_accepted = TRUE,
        active = TRUE,
        must_change_password = FALSE,
        token = NULL
    RETURNING id INTO v_user_id;

    INSERT INTO partner_user (
        partner_id, user_id, active, created_by, updated_by
    )
    VALUES (v_partner_id, v_user_id, TRUE, 'DEV_SEED', 'DEV_SEED')
    ON CONFLICT (partner_id, user_id) DO UPDATE
        SET active = TRUE, updated_by = 'DEV_SEED';
END $$;
