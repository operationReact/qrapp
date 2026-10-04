CREATE TABLE IF NOT EXISTS tax_profile (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(160) NOT NULL,
    tax_type VARCHAR(30) NOT NULL DEFAULT 'NONE',
    gst_rate NUMERIC(7,4) NOT NULL DEFAULT 0,
    cgst_rate NUMERIC(7,4) NOT NULL DEFAULT 0,
    sgst_rate NUMERIC(7,4) NOT NULL DEFAULT 0,
    igst_rate NUMERIC(7,4) NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    itc_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    hsn_sac VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_tax_profile_rates_nonnegative CHECK (
        gst_rate >= 0 AND cgst_rate >= 0 AND sgst_rate >= 0 AND igst_rate >= 0
    ),
    CONSTRAINT chk_tax_profile_type CHECK (tax_type IN ('NONE', 'INTRA_STATE', 'INTER_STATE'))
);

INSERT INTO tax_profile (
    code, name, tax_type, gst_rate, cgst_rate, sgst_rate, igst_rate,
    active, effective_from, itc_eligible
)
VALUES ('NO_GST', 'No GST configured', 'NONE', 0, 0, 0, 0, TRUE, CURRENT_DATE, FALSE)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE menu_item
    ADD COLUMN IF NOT EXISTS tax_profile_id BIGINT,
    ADD COLUMN IF NOT EXISTS hsn_sac VARCHAR(20);

ALTER TABLE menu_item
    DROP CONSTRAINT IF EXISTS fk_menu_item_tax_profile;

ALTER TABLE menu_item
    ADD CONSTRAINT fk_menu_item_tax_profile
    FOREIGN KEY (tax_profile_id) REFERENCES tax_profile(id);

ALTER TABLE locations
    ADD COLUMN IF NOT EXISTS supplier_legal_name VARCHAR(200),
    ADD COLUMN IF NOT EXISTS supplier_gstin VARCHAR(15),
    ADD COLUMN IF NOT EXISTS supplier_state_code VARCHAR(2);
