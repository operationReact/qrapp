CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS invoice (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL UNIQUE REFERENCES orders(id),
    invoice_number VARCHAR(40) NOT NULL UNIQUE,
    financial_year VARCHAR(5) NOT NULL,
    invoice_date DATE NOT NULL,
    supplier_name VARCHAR(200),
    supplier_gstin VARCHAR(15),
    supplier_address TEXT,
    supplier_state VARCHAR(120),
    supplier_state_code VARCHAR(2),
    customer_name VARCHAR(200),
    customer_phone VARCHAR(40),
    customer_email VARCHAR(254),
    place_of_supply VARCHAR(120),
    taxable_amount NUMERIC(19,2) NOT NULL,
    cgst_amount NUMERIC(19,2) NOT NULL,
    sgst_amount NUMERIC(19,2) NOT NULL,
    igst_amount NUMERIC(19,2) NOT NULL,
    total_tax NUMERIC(19,2) NOT NULL,
    discount_amount NUMERIC(19,2) NOT NULL,
    grand_total NUMERIC(19,2) NOT NULL,
    payment_method VARCHAR(40),
    status VARCHAR(20) NOT NULL DEFAULT 'ISSUED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
