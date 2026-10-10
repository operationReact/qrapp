-- Separate Manual Invoice Generation module. Its global numbering series is
-- deliberately distinct from the automatic order invoice series
-- (invoice_number_seq) so the two can never collide or share gaps.
CREATE SEQUENCE IF NOT EXISTS manual_invoice_number_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE manual_invoice (
    id BIGSERIAL PRIMARY KEY,
    -- Human-facing number. NULL while DRAFT; assigned from manual_invoice_number_seq on finalize.
    invoice_number VARCHAR(40) UNIQUE,
    financial_year VARCHAR(5),
    invoice_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    source_type VARCHAR(20) NOT NULL,
    link_type VARCHAR(20) NOT NULL,
    linked_order_id BIGINT,
    linked_reference VARCHAR(120),

    -- Supplier identity snapshot (captured from invoice configuration on finalize).
    supplier_name VARCHAR(200),
    supplier_gstin VARCHAR(15),
    supplier_address TEXT,
    supplier_state VARCHAR(120),
    supplier_state_code VARCHAR(2),

    -- Customer / party details.
    customer_name VARCHAR(200) NOT NULL,
    customer_phone VARCHAR(40),
    customer_email VARCHAR(254),
    customer_gstin VARCHAR(15),
    customer_address TEXT,
    place_of_supply VARCHAR(120),
    place_of_supply_state_code VARCHAR(2),
    inter_state BOOLEAN NOT NULL DEFAULT FALSE,

    notes TEXT,

    -- Recalculated monetary snapshot.
    taxable_amount NUMERIC(19,2) NOT NULL DEFAULT 0,
    cgst_amount NUMERIC(19,2) NOT NULL DEFAULT 0,
    sgst_amount NUMERIC(19,2) NOT NULL DEFAULT 0,
    igst_amount NUMERIC(19,2) NOT NULL DEFAULT 0,
    total_tax NUMERIC(19,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(19,2) NOT NULL DEFAULT 0,
    grand_total NUMERIC(19,2) NOT NULL DEFAULT 0,

    finalized_at TIMESTAMPTZ,
    finalized_by VARCHAR(120),
    cancelled_at TIMESTAMPTZ,
    cancelled_by VARCHAR(120),
    cancel_reason VARCHAR(500),

    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(120),
    updated_by VARCHAR(120),

    CONSTRAINT ck_manual_invoice_status CHECK (status IN ('DRAFT', 'FINALIZED', 'CANCELLED')),
    CONSTRAINT ck_manual_invoice_source_type CHECK (source_type IN ('PARTY_EVENT', 'BULK_ORDER', 'REGULAR_ORDER')),
    CONSTRAINT ck_manual_invoice_link_type CHECK (link_type IN ('LINKED', 'STANDALONE'))
);

-- A linked source may back at most one live (non-cancelled) manual invoice. This
-- enforces the source duplicate rule at the database level regardless of races.
CREATE UNIQUE INDEX uq_manual_invoice_live_source
    ON manual_invoice (source_type, linked_order_id)
    WHERE linked_order_id IS NOT NULL AND status <> 'CANCELLED';

CREATE INDEX idx_manual_invoice_status_date ON manual_invoice (status, invoice_date DESC, id DESC);
CREATE INDEX idx_manual_invoice_source ON manual_invoice (source_type);
CREATE INDEX idx_manual_invoice_number ON manual_invoice (invoice_number);

CREATE TABLE manual_invoice_line_item (
    id BIGSERIAL PRIMARY KEY,
    manual_invoice_id BIGINT NOT NULL REFERENCES manual_invoice(id) ON DELETE CASCADE,
    line_number INT NOT NULL,
    description VARCHAR(300) NOT NULL,
    hsn_sac VARCHAR(20) NOT NULL,
    quantity NUMERIC(19,3) NOT NULL,
    unit_price NUMERIC(19,2) NOT NULL,
    gst_rate NUMERIC(7,4) NOT NULL,
    taxable_amount NUMERIC(19,2) NOT NULL,
    cgst_rate NUMERIC(7,4) NOT NULL DEFAULT 0,
    cgst_amount NUMERIC(19,2) NOT NULL DEFAULT 0,
    sgst_rate NUMERIC(7,4) NOT NULL DEFAULT 0,
    sgst_amount NUMERIC(19,2) NOT NULL DEFAULT 0,
    igst_rate NUMERIC(7,4) NOT NULL DEFAULT 0,
    igst_amount NUMERIC(19,2) NOT NULL DEFAULT 0,
    total_tax NUMERIC(19,2) NOT NULL DEFAULT 0,
    line_total NUMERIC(19,2) NOT NULL DEFAULT 0
);

CREATE INDEX idx_manual_invoice_line_item_invoice ON manual_invoice_line_item (manual_invoice_id);

CREATE TABLE manual_invoice_audit (
    id BIGSERIAL PRIMARY KEY,
    manual_invoice_id BIGINT NOT NULL,
    action VARCHAR(40) NOT NULL,
    actor_user_id BIGINT,
    actor_name VARCHAR(160),
    actor_role VARCHAR(40),
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    reason VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_manual_invoice_audit_invoice ON manual_invoice_audit (manual_invoice_id, created_at DESC, id DESC);
