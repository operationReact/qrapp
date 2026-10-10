-- Development-only Phase 5 finance fixture.
-- This migration is intentionally inert outside a database whose name contains "dev".
DO $$
DECLARE
    v_partner_id BIGINT;
    v_location_id BIGINT;
    v_location_code VARCHAR(80);
BEGIN
    IF current_database() !~* '(^|[_-])dev($|[_-])' THEN
        RETURN;
    END IF;

    SELECT id INTO v_partner_id
    FROM partner
    WHERE partner_code = 'URBANWRK';

    SELECT pl.location_id, l.code
    INTO v_location_id, v_location_code
    FROM partner_location pl
    JOIN locations l ON l.id = pl.location_id
    WHERE pl.partner_id = v_partner_id
      AND pl.status = 'ACTIVE'
      AND l.is_active = TRUE
    ORDER BY pl.id
    LIMIT 1;

    IF v_partner_id IS NULL OR v_location_id IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO partner_commission_agreement (
        partner_id, commission_type, commission_basis, rate_percent,
        effective_from, tax_treatment, status, notes, created_by, updated_by
    )
    SELECT v_partner_id, 'PERCENTAGE', 'ELIGIBLE_SALES', 5.0000,
           DATE '2026-01-01', 'DEFERRED', 'ACTIVE',
           'DEV_ONLY synthetic agreement for Phase 5 validation',
           'DEV_FINANCE_FIXTURE', 'DEV_FINANCE_FIXTURE'
    WHERE NOT EXISTS (
        SELECT 1
        FROM partner_commission_agreement
        WHERE partner_id = v_partner_id
          AND effective_from = DATE '2026-01-01'
          AND status <> 'VOID'
    );

    INSERT INTO orders (
        order_number, location_code, location_id, status, payment_status,
        payment_method, pre_order, created_at, completed_at,
        subtotal, coupon_discount, tax, grand_total
    )
    SELECT 'DEV-FIN-20260915-0001', v_location_code, v_location_id, 'COMPLETED', 'PAID',
           'RAZORPAY', FALSE, TIMESTAMP '2026-09-15 10:00:00',
           TIMESTAMP '2026-09-15 10:20:00', 100.00, 10.00, 5.00, 95.00
    WHERE NOT EXISTS (
        SELECT 1 FROM orders WHERE order_number = 'DEV-FIN-20260915-0001'
    );

    INSERT INTO orders (
        order_number, location_code, location_id, status, payment_status,
        payment_method, pre_order, created_at, completed_at,
        subtotal, coupon_discount, tax, grand_total
    )
    SELECT 'DEV-FIN-20260920-0001', v_location_code, v_location_id, 'COMPLETED', 'PAID',
           'WALLET', FALSE, TIMESTAMP '2026-09-20 12:00:00',
           TIMESTAMP '2026-09-20 12:15:00', 50.00, 0.00, 2.50, 52.50
    WHERE NOT EXISTS (
        SELECT 1 FROM orders WHERE order_number = 'DEV-FIN-20260920-0001'
    );

    -- This order is included as a line item but must be excluded from eligible sales.
    INSERT INTO orders (
        order_number, location_code, location_id, status, payment_status,
        payment_method, pre_order, created_at, completed_at,
        subtotal, coupon_discount, tax, grand_total
    )
    SELECT 'DEV-FIN-20260925-0001', v_location_code, v_location_id, 'COMPLETED', 'PAID',
           'PAY_AT_STALL', TRUE, TIMESTAMP '2026-09-25 09:00:00',
           TIMESTAMP '2026-09-25 09:30:00', 30.00, 0.00, 1.50, 31.50
    WHERE NOT EXISTS (
        SELECT 1 FROM orders WHERE order_number = 'DEV-FIN-20260925-0001'
    );
END $$;
