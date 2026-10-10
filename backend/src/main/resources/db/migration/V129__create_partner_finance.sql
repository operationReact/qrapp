-- Phase 5: partner commission agreements, monthly settlements, immutable line items,
-- explicit adjustments and a finance audit trail. Tax/TDS is intentionally not computed.

CREATE TABLE partner_commission_agreement (
    id BIGSERIAL PRIMARY KEY,
    partner_id BIGINT NOT NULL REFERENCES partner(id),
    commission_type VARCHAR(30) NOT NULL DEFAULT 'PERCENTAGE',
    commission_basis VARCHAR(30) NOT NULL,
    rate_percent NUMERIC(7,4) NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    tax_treatment VARCHAR(30) NOT NULL DEFAULT 'DEFERRED',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    notes VARCHAR(500),
    void_reason VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(160),
    updated_by VARCHAR(160),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT ck_pca_type CHECK (commission_type IN ('PERCENTAGE')),
    CONSTRAINT ck_pca_basis CHECK (commission_basis IN ('GROSS_SALES', 'NET_SALES', 'ELIGIBLE_SALES')),
    CONSTRAINT ck_pca_rate CHECK (rate_percent > 0 AND rate_percent <= 100),
    CONSTRAINT ck_pca_dates CHECK (effective_to IS NULL OR effective_to >= effective_from),
    CONSTRAINT ck_pca_tax_treatment CHECK (tax_treatment IN ('DEFERRED', 'NOT_APPLICABLE')),
    CONSTRAINT ck_pca_status CHECK (status IN ('ACTIVE', 'VOID'))
);

CREATE INDEX idx_pca_partner_effective ON partner_commission_agreement(partner_id, effective_from);

CREATE TABLE partner_settlement (
    id BIGSERIAL PRIMARY KEY,
    partner_id BIGINT NOT NULL REFERENCES partner(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    partner_name_snapshot VARCHAR(200) NOT NULL,
    tax_treatment VARCHAR(30) NOT NULL DEFAULT 'DEFERRED',
    order_count INTEGER NOT NULL DEFAULT 0,
    eligible_order_count INTEGER NOT NULL DEFAULT 0,
    gross_sales NUMERIC(19,2) NOT NULL DEFAULT 0,
    discount_total NUMERIC(19,2) NOT NULL DEFAULT 0,
    tax_total NUMERIC(19,2) NOT NULL DEFAULT 0,
    refund_total NUMERIC(19,2) NOT NULL DEFAULT 0,
    order_grand_total NUMERIC(19,2) NOT NULL DEFAULT 0,
    net_sales NUMERIC(19,2) NOT NULL DEFAULT 0,
    eligible_sales NUMERIC(19,2) NOT NULL DEFAULT 0,
    commission_basis_total NUMERIC(19,2) NOT NULL DEFAULT 0,
    commission_amount NUMERIC(19,2) NOT NULL DEFAULT 0,
    adjustment_total NUMERIC(19,2) NOT NULL DEFAULT 0,
    net_payable NUMERIC(19,2) NOT NULL DEFAULT 0,
    refund_data_available BOOLEAN NOT NULL DEFAULT FALSE,
    calculation_count INTEGER NOT NULL DEFAULT 0,
    calculated_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by VARCHAR(160),
    paid_at TIMESTAMPTZ,
    paid_by VARCHAR(160),
    paid_on DATE,
    payment_reference VARCHAR(100),
    payment_note VARCHAR(500),
    voided_at TIMESTAMPTZ,
    voided_by VARCHAR(160),
    void_reason VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(160),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT ck_ps_status CHECK (status IN ('DRAFT', 'CALCULATED', 'APPROVED', 'PAID', 'VOID')),
    CONSTRAINT ck_ps_period_start CHECK (EXTRACT(DAY FROM period_start) = 1),
    CONSTRAINT ck_ps_period_end CHECK (period_end = ((period_start + INTERVAL '1 month')::date - 1)),
    CONSTRAINT ck_ps_tax_treatment CHECK (tax_treatment IN ('DEFERRED', 'NOT_APPLICABLE')),
    CONSTRAINT ck_ps_counts CHECK (order_count >= 0 AND eligible_order_count >= 0 AND eligible_order_count <= order_count),
    CONSTRAINT ck_ps_paid CHECK (status <> 'PAID' OR (paid_at IS NOT NULL AND payment_reference IS NOT NULL)),
    CONSTRAINT ck_ps_void CHECK (status <> 'VOID' OR (voided_at IS NOT NULL AND void_reason IS NOT NULL))
);

CREATE UNIQUE INDEX uq_partner_settlement_active_period
    ON partner_settlement(partner_id, period_start)
    WHERE status <> 'VOID';
CREATE INDEX idx_partner_settlement_partner_period ON partner_settlement(partner_id, period_start DESC);
CREATE INDEX idx_partner_settlement_partner_status ON partner_settlement(partner_id, status);

CREATE TABLE partner_settlement_line_item (
    id BIGSERIAL PRIMARY KEY,
    settlement_id BIGINT NOT NULL REFERENCES partner_settlement(id),
    partner_id BIGINT NOT NULL REFERENCES partner(id),
    order_id BIGINT NOT NULL,
    order_number VARCHAR(50),
    location_id BIGINT NOT NULL,
    location_code VARCHAR(80),
    location_name VARCHAR(255),
    completed_at TIMESTAMP NOT NULL,
    agreement_id BIGINT REFERENCES partner_commission_agreement(id),
    commission_basis VARCHAR(30),
    rate_percent NUMERIC(7,4),
    gross_amount NUMERIC(19,2) NOT NULL,
    discount_amount NUMERIC(19,2) NOT NULL,
    tax_amount NUMERIC(19,2) NOT NULL,
    grand_total NUMERIC(19,2) NOT NULL,
    refund_amount NUMERIC(19,2) NOT NULL DEFAULT 0,
    refund_net_amount NUMERIC(19,2) NOT NULL DEFAULT 0,
    net_amount NUMERIC(19,2) NOT NULL,
    eligible BOOLEAN NOT NULL,
    exclusion_reason VARCHAR(40),
    basis_amount NUMERIC(19,2) NOT NULL DEFAULT 0,
    commission_amount NUMERIC(19,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_psli_settlement_order UNIQUE (settlement_id, order_id),
    CONSTRAINT ck_psli_refund CHECK (refund_amount >= 0 AND refund_net_amount >= 0)
);

CREATE INDEX idx_psli_settlement_completed ON partner_settlement_line_item(settlement_id, completed_at, id);
CREATE INDEX idx_psli_settlement_location ON partner_settlement_line_item(settlement_id, location_id);
CREATE INDEX idx_psli_order ON partner_settlement_line_item(order_id);
CREATE INDEX idx_psli_agreement ON partner_settlement_line_item(agreement_id);

CREATE TABLE partner_settlement_adjustment (
    id BIGSERIAL PRIMARY KEY,
    settlement_id BIGINT NOT NULL REFERENCES partner_settlement(id),
    partner_id BIGINT NOT NULL REFERENCES partner(id),
    adjustment_type VARCHAR(30) NOT NULL,
    amount NUMERIC(19,2) NOT NULL,
    reason VARCHAR(500) NOT NULL,
    created_by VARCHAR(160) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_psa_type CHECK (adjustment_type IN ('MANUAL_CREDIT', 'MANUAL_DEBIT', 'REFUND_ADJUSTMENT')),
    CONSTRAINT ck_psa_amount CHECK (amount <> 0),
    CONSTRAINT ck_psa_sign CHECK (
        (adjustment_type = 'MANUAL_CREDIT' AND amount > 0)
        OR (adjustment_type IN ('MANUAL_DEBIT', 'REFUND_ADJUSTMENT') AND amount < 0))
);

CREATE INDEX idx_psa_settlement ON partner_settlement_adjustment(settlement_id, created_at);

CREATE TABLE partner_finance_audit (
    id BIGSERIAL PRIMARY KEY,
    partner_id BIGINT NOT NULL REFERENCES partner(id),
    entity_type VARCHAR(30) NOT NULL,
    entity_id BIGINT NOT NULL,
    action VARCHAR(40) NOT NULL,
    actor_user_id BIGINT,
    actor_name VARCHAR(160),
    actor_role VARCHAR(40),
    previous_value TEXT,
    new_value TEXT,
    reason VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_pfa_entity CHECK (entity_type IN ('AGREEMENT', 'SETTLEMENT'))
);

CREATE INDEX idx_pfa_entity ON partner_finance_audit(partner_id, entity_type, entity_id, created_at);

-- Supports the per-partner, per-month completed-order scan used by settlement generation.
CREATE INDEX IF NOT EXISTS idx_orders_location_status_completed
    ON orders (location_id, status, completed_at);

-- Database-level guards: settlement lifecycle, financial immutability and append-only history.
CREATE OR REPLACE FUNCTION partner_settlement_guard() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'partner_settlement rows cannot be deleted';
    END IF;
    IF OLD.status IN ('PAID', 'VOID') THEN
        RAISE EXCEPTION 'partner_settlement in terminal status % is immutable', OLD.status;
    END IF;
    IF NEW.partner_id IS DISTINCT FROM OLD.partner_id
       OR NEW.period_start IS DISTINCT FROM OLD.period_start
       OR NEW.period_end IS DISTINCT FROM OLD.period_end THEN
        RAISE EXCEPTION 'partner_settlement partner and period are immutable';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
           (OLD.status = 'DRAFT' AND NEW.status IN ('CALCULATED', 'VOID'))
        OR (OLD.status = 'CALCULATED' AND NEW.status IN ('APPROVED', 'VOID'))
        OR (OLD.status = 'APPROVED' AND NEW.status IN ('PAID', 'VOID'))) THEN
        RAISE EXCEPTION 'invalid partner_settlement status transition % -> %', OLD.status, NEW.status;
    END IF;
    IF OLD.status = 'APPROVED' AND (
           NEW.order_count IS DISTINCT FROM OLD.order_count
        OR NEW.eligible_order_count IS DISTINCT FROM OLD.eligible_order_count
        OR NEW.gross_sales IS DISTINCT FROM OLD.gross_sales
        OR NEW.discount_total IS DISTINCT FROM OLD.discount_total
        OR NEW.tax_total IS DISTINCT FROM OLD.tax_total
        OR NEW.refund_total IS DISTINCT FROM OLD.refund_total
        OR NEW.order_grand_total IS DISTINCT FROM OLD.order_grand_total
        OR NEW.net_sales IS DISTINCT FROM OLD.net_sales
        OR NEW.eligible_sales IS DISTINCT FROM OLD.eligible_sales
        OR NEW.commission_basis_total IS DISTINCT FROM OLD.commission_basis_total
        OR NEW.commission_amount IS DISTINCT FROM OLD.commission_amount
        OR NEW.adjustment_total IS DISTINCT FROM OLD.adjustment_total
        OR NEW.net_payable IS DISTINCT FROM OLD.net_payable) THEN
        RAISE EXCEPTION 'approved partner_settlement financial values are immutable';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_partner_settlement_guard
    BEFORE UPDATE OR DELETE ON partner_settlement
    FOR EACH ROW EXECUTE PROCEDURE partner_settlement_guard();

CREATE OR REPLACE FUNCTION partner_settlement_line_item_guard() RETURNS trigger AS $$
DECLARE
    parent_status VARCHAR(20);
    parent_id BIGINT;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'partner_settlement_line_item rows are immutable';
    END IF;
    IF TG_OP = 'DELETE' THEN
        parent_id := OLD.settlement_id;
    ELSE
        parent_id := NEW.settlement_id;
    END IF;
    SELECT status INTO parent_status FROM partner_settlement WHERE id = parent_id;
    IF parent_status IS NULL OR parent_status NOT IN ('DRAFT', 'CALCULATED') THEN
        RAISE EXCEPTION 'partner_settlement_line_item changes are only allowed while the settlement is DRAFT or CALCULATED';
    END IF;
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_partner_settlement_line_item_guard
    BEFORE INSERT OR UPDATE OR DELETE ON partner_settlement_line_item
    FOR EACH ROW EXECUTE PROCEDURE partner_settlement_line_item_guard();

CREATE OR REPLACE FUNCTION partner_settlement_adjustment_guard() RETURNS trigger AS $$
DECLARE
    parent_status VARCHAR(20);
BEGIN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        RAISE EXCEPTION 'partner_settlement_adjustment rows are append-only';
    END IF;
    SELECT status INTO parent_status FROM partner_settlement WHERE id = NEW.settlement_id;
    IF parent_status IS NULL OR parent_status NOT IN ('DRAFT', 'CALCULATED') THEN
        RAISE EXCEPTION 'partner_settlement_adjustment can only be added while the settlement is DRAFT or CALCULATED';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_partner_settlement_adjustment_guard
    BEFORE INSERT OR UPDATE OR DELETE ON partner_settlement_adjustment
    FOR EACH ROW EXECUTE PROCEDURE partner_settlement_adjustment_guard();

CREATE OR REPLACE FUNCTION partner_finance_audit_guard() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'partner_finance_audit rows are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_partner_finance_audit_guard
    BEFORE UPDATE OR DELETE ON partner_finance_audit
    FOR EACH ROW EXECUTE PROCEDURE partner_finance_audit_guard();
