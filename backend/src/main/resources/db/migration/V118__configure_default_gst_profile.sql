INSERT INTO tax_profile (
    code, name, tax_type, gst_rate, cgst_rate, sgst_rate, igst_rate,
    active, effective_from, itc_eligible
)
VALUES (
    'GST_5_INTRA', 'GST 5% (2.5% CGST + 2.5% SGST)', 'INTRA_STATE',
    5, 2.5, 2.5, 0, TRUE, CURRENT_DATE, FALSE
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    tax_type = EXCLUDED.tax_type,
    gst_rate = EXCLUDED.gst_rate,
    cgst_rate = EXCLUDED.cgst_rate,
    sgst_rate = EXCLUDED.sgst_rate,
    igst_rate = EXCLUDED.igst_rate,
    active = EXCLUDED.active;

UPDATE menu_item
SET tax_profile_id = (SELECT id FROM tax_profile WHERE code = 'GST_5_INTRA')
WHERE tax_profile_id IS NULL
   OR tax_profile_id IN (
       SELECT id FROM tax_profile
       WHERE tax_type = 'NONE' OR gst_rate = 0
   );
