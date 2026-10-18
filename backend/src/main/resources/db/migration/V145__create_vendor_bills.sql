-- Location-scoped vendor (external supplier) bills raised by VENDOR login users.
CREATE TABLE IF NOT EXISTS vendor_bill (
    id                 BIGSERIAL PRIMARY KEY,
    location_id        BIGINT       NOT NULL REFERENCES locations (id),
    vendor_user_id     BIGINT       NOT NULL REFERENCES users (id),
    vendor_name        VARCHAR(160) NOT NULL,
    invoice_number     VARCHAR(80)  NOT NULL,
    invoice_date       DATE         NOT NULL,
    status             VARCHAR(30)  NOT NULL,
    notes              TEXT,
    total_amount       NUMERIC(19,2) NOT NULL DEFAULT 0,
    submitted_at       TIMESTAMP,
    approved_at        TIMESTAMP,
    approved_by        VARCHAR(120),
    payment_method     VARCHAR(30),
    payment_reference  VARCHAR(120),
    paid_amount        NUMERIC(19,2),
    paid_at            TIMESTAMP,
    paid_by            VARCHAR(120),
    created_at         TIMESTAMP    NOT NULL,
    updated_at         TIMESTAMP    NOT NULL,
    version            BIGINT       NOT NULL DEFAULT 0,
    CONSTRAINT chk_vendor_bill_status CHECK (status IN ('DRAFT', 'SUBMITTED', 'CORRECTION_REQUESTED', 'APPROVED', 'PAID'))
);

CREATE INDEX IF NOT EXISTS idx_vendor_bill_location_status ON vendor_bill (location_id, status);
CREATE INDEX IF NOT EXISTS idx_vendor_bill_vendor_user ON vendor_bill (vendor_user_id);

CREATE TABLE IF NOT EXISTS vendor_bill_item (
    id          BIGSERIAL PRIMARY KEY,
    bill_id     BIGINT        NOT NULL REFERENCES vendor_bill (id) ON DELETE CASCADE,
    description VARCHAR(200)  NOT NULL,
    quantity    NUMERIC(12,3) NOT NULL,
    unit        VARCHAR(20),
    unit_price  NUMERIC(19,2) NOT NULL,
    line_total  NUMERIC(19,2) NOT NULL,
    sort_order  INTEGER       NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_vendor_bill_item_bill ON vendor_bill_item (bill_id);

CREATE TABLE IF NOT EXISTS vendor_bill_event (
    id            BIGSERIAL PRIMARY KEY,
    bill_id       BIGINT       NOT NULL REFERENCES vendor_bill (id) ON DELETE CASCADE,
    actor_user_id BIGINT,
    actor_name    VARCHAR(120) NOT NULL,
    actor_role    VARCHAR(30)  NOT NULL,
    event_type    VARCHAR(30)  NOT NULL,
    message       TEXT,
    created_at    TIMESTAMP    NOT NULL,
    CONSTRAINT chk_vendor_bill_event_type CHECK (event_type IN ('CREATED', 'SUBMITTED', 'COMMENT', 'CORRECTION_REQUESTED', 'APPROVED', 'PAID'))
);

CREATE INDEX IF NOT EXISTS idx_vendor_bill_event_bill ON vendor_bill_event (bill_id, created_at);
