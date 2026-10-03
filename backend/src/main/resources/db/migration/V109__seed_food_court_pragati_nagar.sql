-- =============================================================================
-- V109__seed_food_court_pragati_nagar.sql
-- Initial Food Court Management data. Unknown agreement/payment dates and
-- methods are intentionally left NULL; the values below are imported business
-- data, not application defaults.
-- =============================================================================

DO $$
DECLARE
    v_fc UUID;
    v_landlord UUID;
    v_stall UUID;
    v_tenant UUID;
    v_lease UUID;
    v_names TEXT[] := ARRAY[
        'Salado', 'Kalimi', 'Tatibellam Coffee', 'MAD Over Biryani',
        'KBR', 'Panpuri', 'Wok & Walk', 'Waffle'
    ];
    v_rents NUMERIC[] := ARRAY[15000, 25000, 18000, 15000, 18000, 15000, 15000, 6000];
    v_deposits NUMERIC[] := ARRAY[75000, 100000, 50000, 20000, 72000, 40000, 130000, 0];
    i INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM fc_food_courts WHERE LOWER(code) = 'pragati_nagar') THEN
        RETURN;
    END IF;

    INSERT INTO fc_food_courts (code, name, status, total_stalls, notes, created_by, updated_by)
    VALUES (
        'PRAGATI_NAGAR',
        'Pragati Nagar Food Court',
        'ACTIVE',
        8,
        'Imported initial Food Court Management records.',
        'system',
        'system'
    )
    RETURNING id INTO v_fc;

    INSERT INTO fc_landlords (food_court_id, name, notes, created_by, updated_by)
    VALUES (
        v_fc,
        'Pragati Nagar Landowner',
        'Landowner identity and agreement dates require confirmation.',
        'system',
        'system'
    )
    RETURNING id INTO v_landlord;

    INSERT INTO fc_property_leases (
        food_court_id, landlord_id, monthly_rent, status, notes, created_by, updated_by
    )
    VALUES (
        v_fc, v_landlord, 50000, 'ACTIVE',
        'Imported current landowner lease. Dates/payment method were not provided.',
        'system', 'system'
    );

    FOR i IN 1..8 LOOP
        INSERT INTO fc_stalls (
            food_court_id, code, name, status, notes, created_by, updated_by
        )
        VALUES (
            v_fc, LPAD(i::TEXT, 2, '0'), v_names[i], 'OCCUPIED',
            'Stall identifier assigned for the imported initial tenant list.',
            'system', 'system'
        )
        RETURNING id INTO v_stall;

        INSERT INTO fc_tenants (
            food_court_id, name, business_name, status, notes, created_by, updated_by
        )
        VALUES (
            v_fc, v_names[i], v_names[i], 'ACTIVE',
            CASE
                WHEN i IN (6, 7) THEN 'Imported advance includes asset/vehicle consideration; asset details require confirmation.'
                ELSE 'Imported initial tenant record.'
            END,
            'system', 'system'
        )
        RETURNING id INTO v_tenant;

        INSERT INTO fc_stall_leases (
            food_court_id, stall_id, tenant_id, monthly_rent, deposit_amount,
            status, notes, created_by, updated_by
        )
        VALUES (
            v_fc, v_stall, v_tenant, v_rents[i], v_deposits[i], 'ACTIVE',
            'Imported current tenant terms. Agreement dates, due day and payment method were not provided.',
            'system', 'system'
        )
        RETURNING id INTO v_lease;

        INSERT INTO fc_deposits (
            food_court_id, lease_type, lease_id, tenant_id, deposit_type,
            amount, refunded_amount, status, notes, created_by, updated_by
        )
        VALUES (
            v_fc, 'STALL', v_lease, v_tenant,
            CASE WHEN i IN (6, 7) THEN 'ASSET_CONSIDERATION' ELSE 'ADVANCE' END,
            v_deposits[i], 0, 'HELD',
            CASE
                WHEN i IN (6, 7) THEN 'Payment includes vehicle/asset consideration; no value or asset details were supplied.'
                ELSE 'Imported advance amount; payment date and method were not supplied.'
            END,
            'system', 'system'
        );
    END LOOP;
END $$;
