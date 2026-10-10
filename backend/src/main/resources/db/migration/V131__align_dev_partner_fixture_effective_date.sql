-- Align the existing development-only Urban Work association with the
-- September 2026 finance fixture period.
DO $$
BEGIN
    IF current_database() !~* '(^|[_-])dev($|[_-])' THEN
        RETURN;
    END IF;

    UPDATE partner_location pl
    SET effective_from = DATE '2026-01-01',
        updated_by = 'DEV_FINANCE_FIXTURE'
    FROM partner p
    WHERE pl.partner_id = p.id
      AND p.partner_code = 'URBANWRK'
      AND pl.status = 'ACTIVE'
      AND (pl.effective_from IS NULL OR pl.effective_from > DATE '2026-01-01');
END $$;
