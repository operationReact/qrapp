-- Monthly landlord obligations are snapshots of the property lease terms.
CREATE TABLE IF NOT EXISTS fc_landlord_rent_obligations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    food_court_id UUID NOT NULL REFERENCES fc_food_courts(id),
    property_lease_id UUID NOT NULL REFERENCES fc_property_leases(id),
    billing_year INTEGER NOT NULL,
    billing_month INTEGER NOT NULL,
    due_date DATE,
    expected_amount NUMERIC(14,2) NOT NULL,
    paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    paid_date DATE,
    notes TEXT,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uq_fc_landlord_rent_period UNIQUE (property_lease_id, billing_year, billing_month),
    CONSTRAINT chk_fc_landlord_rent_month CHECK (billing_month BETWEEN 1 AND 12),
    CONSTRAINT chk_fc_landlord_rent_amounts CHECK (expected_amount >= 0 AND paid_amount >= 0 AND paid_amount <= expected_amount),
    CONSTRAINT chk_fc_landlord_rent_status CHECK (status IN ('PENDING','PARTIALLY_PAID','PAID','OVERDUE','WAIVED'))
);
CREATE INDEX IF NOT EXISTS idx_fc_landlord_rent_food_court
    ON fc_landlord_rent_obligations (food_court_id, billing_year, billing_month);
