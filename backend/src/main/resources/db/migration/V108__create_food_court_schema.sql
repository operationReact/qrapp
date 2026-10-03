-- =============================================================================
-- V108__create_food_court_schema.sql
-- Food Court Management bounded context.
--
-- A self-contained, ordering-decoupled property/rent-management domain. Every
-- table is prefixed `fc_` and uses UUID surrogate keys with their own foreign
-- keys *only* amongst `fc_*` tables — there are deliberately NO foreign keys
-- into ordering tables (users, orders, locations, ...). User references are
-- stored as opaque VARCHAR ids, not FKs. Monetary values use NUMERIC and dates
-- are nullable where historical agreements may have unknown terms.
--
-- Tables are created in dependency order. gen_random_uuid() (built into
-- PostgreSQL 13+) supplies defaults for direct SQL inserts; the application
-- otherwise assigns UUIDs via Hibernate.
-- =============================================================================

-- ── Root aggregate: food courts ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fc_food_courts (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    code           VARCHAR(60)  NOT NULL,
    name           VARCHAR(150) NOT NULL,
    address_line   VARCHAR(255),
    city           VARCHAR(100),
    state          VARCHAR(100),
    postal_code    VARCHAR(20),
    contact_phone  VARCHAR(30),
    total_stalls   INTEGER,
    status         VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    notes          TEXT,
    created_by     VARCHAR(100),
    updated_by     VARCHAR(100),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ,
    version        BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_fc_food_court_status CHECK (status IN ('ACTIVE','INACTIVE','CLOSED'))
);
-- Food court code is unique amongst non-deleted rows.
CREATE UNIQUE INDEX IF NOT EXISTS uq_fc_food_courts_code
    ON fc_food_courts (LOWER(code)) WHERE deleted_at IS NULL;

-- ── Stalls ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fc_stalls (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    food_court_id  UUID         NOT NULL REFERENCES fc_food_courts(id),
    code           VARCHAR(40)  NOT NULL,
    name           VARCHAR(120),
    floor          VARCHAR(40),
    area_sqft      NUMERIC(12,2),
    base_rent      NUMERIC(14,2),
    status         VARCHAR(20)  NOT NULL DEFAULT 'AVAILABLE',
    notes          TEXT,
    created_by     VARCHAR(100),
    updated_by     VARCHAR(100),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ,
    version        BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_fc_stall_status CHECK (status IN ('AVAILABLE','OCCUPIED','RESERVED','MAINTENANCE','VACANT'))
);
CREATE INDEX IF NOT EXISTS idx_fc_stalls_food_court ON fc_stalls (food_court_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_fc_stalls_code
    ON fc_stalls (food_court_id, LOWER(code)) WHERE deleted_at IS NULL;

-- ── Tenants ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fc_tenants (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    food_court_id  UUID         NOT NULL REFERENCES fc_food_courts(id),
    name           VARCHAR(150) NOT NULL,
    business_name  VARCHAR(180),
    contact_phone  VARCHAR(30),
    contact_email  VARCHAR(150),
    user_id        VARCHAR(100),   -- opaque platform user id (NOT a FK)
    status         VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    notes          TEXT,
    created_by     VARCHAR(100),
    updated_by     VARCHAR(100),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ,
    version        BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_fc_tenant_status CHECK (status IN ('ACTIVE','INACTIVE'))
);
CREATE INDEX IF NOT EXISTS idx_fc_tenants_food_court ON fc_tenants (food_court_id);

-- ── Landlords ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fc_landlords (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    food_court_id  UUID         NOT NULL REFERENCES fc_food_courts(id),
    name           VARCHAR(150) NOT NULL,
    contact_phone  VARCHAR(30),
    contact_email  VARCHAR(150),
    address_line   VARCHAR(255),
    notes          TEXT,
    created_by     VARCHAR(100),
    updated_by     VARCHAR(100),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ,
    version        BIGINT       NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_fc_landlords_food_court ON fc_landlords (food_court_id);

-- ── Stall leases (tenant sub-leases) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fc_stall_leases (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    food_court_id  UUID         NOT NULL REFERENCES fc_food_courts(id),
    stall_id       UUID         NOT NULL REFERENCES fc_stalls(id),
    tenant_id      UUID         NOT NULL REFERENCES fc_tenants(id),
    start_date     DATE,
    end_date       DATE,
    monthly_rent   NUMERIC(14,2) NOT NULL,
    deposit_amount NUMERIC(14,2),
    rent_due_day   INTEGER,
    payment_method VARCHAR(20),
    status         VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    notes          TEXT,
    created_by     VARCHAR(100),
    updated_by     VARCHAR(100),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version        BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_fc_stall_lease_status CHECK (status IN ('PENDING','ACTIVE','ENDED','TERMINATED')),
    CONSTRAINT chk_fc_stall_lease_due_day CHECK (rent_due_day BETWEEN 1 AND 28),
    CONSTRAINT chk_fc_stall_lease_dates CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT chk_fc_stall_lease_payment_method
        CHECK (payment_method IS NULL OR payment_method IN ('CASH','BANK_TRANSFER','UPI','CHEQUE','ASSET','OTHER'))
);
CREATE INDEX IF NOT EXISTS idx_fc_stall_leases_food_court ON fc_stall_leases (food_court_id);
CREATE INDEX IF NOT EXISTS idx_fc_stall_leases_stall ON fc_stall_leases (stall_id);
CREATE INDEX IF NOT EXISTS idx_fc_stall_leases_tenant ON fc_stall_leases (tenant_id);
-- DB backstop: at most one open-ended ACTIVE lease per stall. Full date-range
-- overlap is enforced in the service layer.
CREATE UNIQUE INDEX IF NOT EXISTS uq_fc_stall_leases_active_open
    ON fc_stall_leases (stall_id) WHERE status = 'ACTIVE' AND end_date IS NULL;

-- ── Property (head) leases ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fc_property_leases (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    food_court_id  UUID         NOT NULL REFERENCES fc_food_courts(id),
    landlord_id    UUID         NOT NULL REFERENCES fc_landlords(id),
    start_date     DATE,
    end_date       DATE,
    monthly_rent   NUMERIC(14,2),
    deposit_amount NUMERIC(14,2),
    rent_due_day   INTEGER,
    payment_method VARCHAR(20),
    status         VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    notes          TEXT,
    created_by     VARCHAR(100),
    updated_by     VARCHAR(100),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version        BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_fc_property_lease_status CHECK (status IN ('PENDING','ACTIVE','ENDED','TERMINATED')),
    CONSTRAINT chk_fc_property_lease_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
    CONSTRAINT chk_fc_property_lease_payment_method
        CHECK (payment_method IS NULL OR payment_method IN ('CASH','BANK_TRANSFER','UPI','CHEQUE','ASSET','OTHER'))
);
CREATE INDEX IF NOT EXISTS idx_fc_property_leases_food_court ON fc_property_leases (food_court_id);

-- ── Deposits / asset considerations ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fc_deposits (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    food_court_id    UUID         NOT NULL REFERENCES fc_food_courts(id),
    lease_type       VARCHAR(20)  NOT NULL,
    lease_id         UUID,
    tenant_id        UUID         REFERENCES fc_tenants(id),
    deposit_type     VARCHAR(30)  NOT NULL,
    amount           NUMERIC(14,2) NOT NULL,
    refunded_amount  NUMERIC(14,2) NOT NULL DEFAULT 0,
    status           VARCHAR(20)  NOT NULL DEFAULT 'HELD',
    received_date    DATE,
    payment_method   VARCHAR(20),
    asset_description TEXT,
    notes            TEXT,
    created_by       VARCHAR(100),
    updated_by       VARCHAR(100),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version          BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_fc_deposit_lease_type CHECK (lease_type IN ('STALL','PROPERTY')),
    CONSTRAINT chk_fc_deposit_type CHECK (deposit_type IN ('SECURITY','ADVANCE','ASSET_CONSIDERATION')),
    CONSTRAINT chk_fc_deposit_status CHECK (status IN ('HELD','PARTIALLY_REFUNDED','REFUNDED','ADJUSTED','FORFEITED')),
    CONSTRAINT chk_fc_deposit_refund CHECK (refunded_amount >= 0 AND refunded_amount <= amount),
    CONSTRAINT chk_fc_deposit_payment_method
        CHECK (payment_method IS NULL OR payment_method IN ('CASH','BANK_TRANSFER','UPI','CARD','CHEQUE','OTHER'))
);
CREATE INDEX IF NOT EXISTS idx_fc_deposits_food_court ON fc_deposits (food_court_id);
CREATE INDEX IF NOT EXISTS idx_fc_deposits_lease ON fc_deposits (lease_id);

-- ── Rent invoices (one per lease per month) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS fc_rent_invoices (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    food_court_id    UUID         NOT NULL REFERENCES fc_food_courts(id),
    stall_lease_id   UUID         NOT NULL REFERENCES fc_stall_leases(id),
    stall_id         UUID         NOT NULL REFERENCES fc_stalls(id),
    tenant_id        UUID         NOT NULL REFERENCES fc_tenants(id),
    period_year      INTEGER      NOT NULL,
    period_month     INTEGER      NOT NULL,
    due_date         DATE         NOT NULL,
    rent_amount      NUMERIC(14,2) NOT NULL,
    adjustment_total NUMERIC(14,2) NOT NULL DEFAULT 0,
    net_amount       NUMERIC(14,2) NOT NULL,
    amount_paid      NUMERIC(14,2) NOT NULL DEFAULT 0,
    status           VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    notes            TEXT,
    created_by       VARCHAR(100),
    updated_by       VARCHAR(100),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version          BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_fc_rent_invoice_month CHECK (period_month BETWEEN 1 AND 12),
    CONSTRAINT chk_fc_rent_invoice_status
        CHECK (status IN ('PENDING','DUE_SOON','PARTIALLY_PAID','PAID','OVERDUE','WAIVED','CANCELLED')),
    -- Duplicate-month uniqueness: at most one invoice per lease per period.
    CONSTRAINT uq_fc_rent_invoice_period UNIQUE (stall_lease_id, period_year, period_month)
);
CREATE INDEX IF NOT EXISTS idx_fc_rent_invoices_food_court_period
    ON fc_rent_invoices (food_court_id, period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_fc_rent_invoices_status ON fc_rent_invoices (food_court_id, status);

-- ── Rent payments (append-only financial records) ────────────────────────────
CREATE TABLE IF NOT EXISTS fc_rent_payments (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    food_court_id    UUID         NOT NULL REFERENCES fc_food_courts(id),
    rent_invoice_id  UUID         NOT NULL REFERENCES fc_rent_invoices(id),
    amount           NUMERIC(14,2) NOT NULL,
    payment_method   VARCHAR(20),
    paid_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    reference        VARCHAR(120),
    recorded_by      VARCHAR(100),
    notes            TEXT,
    created_by       VARCHAR(100),
    updated_by       VARCHAR(100),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version          BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_fc_rent_payment_amount CHECK (amount > 0),
    CONSTRAINT chk_fc_rent_payment_method
        CHECK (payment_method IS NULL OR payment_method IN ('CASH','BANK_TRANSFER','UPI','CARD','CHEQUE','OTHER'))
);
CREATE INDEX IF NOT EXISTS idx_fc_rent_payments_invoice ON fc_rent_payments (rent_invoice_id);
CREATE INDEX IF NOT EXISTS idx_fc_rent_payments_food_court ON fc_rent_payments (food_court_id);

-- ── Rent adjustments (append-only) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fc_rent_adjustments (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    food_court_id    UUID         NOT NULL REFERENCES fc_food_courts(id),
    rent_invoice_id  UUID         NOT NULL REFERENCES fc_rent_invoices(id),
    adjustment_type  VARCHAR(20)  NOT NULL,
    amount           NUMERIC(14,2) NOT NULL,
    reason           VARCHAR(255),
    applied_by       VARCHAR(100),
    created_by       VARCHAR(100),
    updated_by       VARCHAR(100),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version          BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_fc_rent_adjustment_type CHECK (adjustment_type IN ('DISCOUNT','WAIVER','LATE_FEE','CORRECTION'))
);
CREATE INDEX IF NOT EXISTS idx_fc_rent_adjustments_invoice ON fc_rent_adjustments (rent_invoice_id);

-- ── Expenses ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fc_expenses (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    food_court_id    UUID         NOT NULL REFERENCES fc_food_courts(id),
    category         VARCHAR(20)  NOT NULL,
    amount           NUMERIC(14,2) NOT NULL,
    expense_date     DATE         NOT NULL,
    payment_method   VARCHAR(20),
    vendor_name      VARCHAR(180),
    description      TEXT,
    recorded_by      VARCHAR(100),
    created_by       VARCHAR(100),
    updated_by       VARCHAR(100),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ,
    version          BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_fc_expense_amount CHECK (amount > 0),
    CONSTRAINT chk_fc_expense_category CHECK (category IN (
        'LEASE','ELECTRICITY','WATER','INTERNET','SECURITY','CLEANING','MAINTENANCE',
        'REPAIR','PEST_CONTROL','MARKETING','WASTE_DISPOSAL','EQUIPMENT','FURNITURE',
        'RENOVATION','OTHER')),
    CONSTRAINT chk_fc_expense_payment_method
        CHECK (payment_method IS NULL OR payment_method IN ('CASH','BANK_TRANSFER','UPI','CHEQUE','ASSET','OTHER'))
);
CREATE INDEX IF NOT EXISTS idx_fc_expenses_food_court_date ON fc_expenses (food_court_id, expense_date);

-- ── Action items ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fc_action_items (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    food_court_id    UUID         NOT NULL REFERENCES fc_food_courts(id),
    title            VARCHAR(200) NOT NULL,
    description      TEXT,
    status           VARCHAR(20)  NOT NULL DEFAULT 'OPEN',
    priority         VARCHAR(20)  NOT NULL DEFAULT 'MEDIUM',
    due_date         DATE,
    assigned_to      VARCHAR(100),
    completed_at     TIMESTAMPTZ,
    created_by       VARCHAR(100),
    updated_by       VARCHAR(100),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ,
    version          BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_fc_action_item_status CHECK (status IN ('OPEN','IN_PROGRESS','BLOCKED','COMPLETED','CANCELLED')),
    CONSTRAINT chk_fc_action_item_priority CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL'))
);
CREATE INDEX IF NOT EXISTS idx_fc_action_items_food_court_status ON fc_action_items (food_court_id, status);

-- ── Per-food-court access grants (opaque user id -> role) ─────────────────────
CREATE TABLE IF NOT EXISTS fc_access (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    food_court_id    UUID         NOT NULL REFERENCES fc_food_courts(id),
    user_id          VARCHAR(100) NOT NULL,   -- opaque platform user id (NOT a FK)
    fc_role          VARCHAR(20)  NOT NULL,
    status           VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_by       VARCHAR(100),
    updated_by       VARCHAR(100),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version          BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_fc_access_role CHECK (fc_role IN (
        'FOODCOURT_SUPER_ADMIN','FOODCOURT_ADMIN','FOODCOURT_MANAGER',
        'FOODCOURT_FINANCE','FOODCOURT_OPERATIONS','FOODCOURT_VIEWER'
    )),
    CONSTRAINT chk_fc_access_status CHECK (status IN ('ACTIVE','REVOKED')),
    CONSTRAINT uq_fc_access_user UNIQUE (food_court_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_fc_access_user ON fc_access (user_id);

-- ── Audit trail (append-only) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fc_audit_events (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    food_court_id    UUID         NOT NULL REFERENCES fc_food_courts(id),
    action           VARCHAR(30)  NOT NULL,
    entity_type      VARCHAR(60)  NOT NULL,
    entity_id        UUID,
    actor_user_id    VARCHAR(100),
    summary          VARCHAR(500),
    occurred_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_by       VARCHAR(100),
    updated_by       VARCHAR(100),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version          BIGINT       NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_fc_audit_events_food_court ON fc_audit_events (food_court_id, occurred_at DESC);

-- ── Document references (opaque URL/key metadata only) ───────────────────────
CREATE TABLE IF NOT EXISTS fc_documents (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    food_court_id    UUID         NOT NULL REFERENCES fc_food_courts(id),
    entity_type      VARCHAR(60)  NOT NULL,
    entity_id        UUID,
    label            VARCHAR(180),
    doc_url          TEXT,
    doc_key          TEXT,
    uploaded_by      VARCHAR(100),
    created_by       VARCHAR(100),
    updated_by       VARCHAR(100),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version          BIGINT       NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_fc_documents_entity ON fc_documents (food_court_id, entity_type, entity_id);

COMMENT ON TABLE fc_food_courts IS
    'Food Court Management context root. Decoupled from the ordering domain: fc_* tables only, opaque user ids, no FKs into ordering tables.';
COMMENT ON COLUMN fc_tenants.user_id IS 'Opaque platform user id. Intentionally NOT a foreign key into users.';
COMMENT ON COLUMN fc_rent_invoices.rent_amount IS 'Snapshot of the lease rent at generation; preserved so historical charges are never rewritten.';
