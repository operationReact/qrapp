CREATE TABLE partner (
    id BIGSERIAL PRIMARY KEY,
    partner_code VARCHAR(40) NOT NULL,
    legal_name VARCHAR(200) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    primary_contact_name VARCHAR(160) NOT NULL,
    primary_contact_email VARCHAR(254) NOT NULL,
    primary_contact_phone VARCHAR(20) NOT NULL,
    alternate_contact_phone VARCHAR(20),
    business_type VARCHAR(100),
    registered_address TEXT,
    city VARCHAR(120),
    state VARCHAR(120),
    pincode VARCHAR(10),
    country VARCHAR(80) NOT NULL DEFAULT 'India',
    gst_registered BOOLEAN NOT NULL DEFAULT FALSE,
    gstin VARCHAR(15),
    pan VARCHAR(10),
    tan VARCHAR(20),
    fssai VARCHAR(20),
    other_registration_details TEXT,
    account_holder_name VARCHAR(160),
    bank_name VARCHAR(160),
    account_number VARCHAR(40),
    ifsc VARCHAR(20),
    upi_id VARCHAR(160),
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(160),
    updated_by VARCHAR(160),
    version BIGINT,
    CONSTRAINT uq_partner_code UNIQUE (partner_code),
    CONSTRAINT ck_partner_status CHECK (status IN ('ACTIVE', 'INACTIVE')),
    CONSTRAINT ck_partner_gst CHECK ((gst_registered = FALSE) OR (gstin IS NOT NULL AND gstin <> ''))
);

CREATE INDEX idx_partner_status ON partner(status);

CREATE TABLE partner_location (
    id BIGSERIAL PRIMARY KEY,
    partner_id BIGINT NOT NULL REFERENCES partner(id),
    location_id BIGINT NOT NULL REFERENCES locations(id),
    relationship_type VARCHAR(20) NOT NULL DEFAULT 'PRIMARY',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    effective_from DATE,
    effective_to DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(160),
    updated_by VARCHAR(160),
    CONSTRAINT ck_partner_location_type CHECK (relationship_type IN ('PRIMARY', 'SECONDARY')),
    CONSTRAINT ck_partner_location_status CHECK (status IN ('ACTIVE', 'INACTIVE')),
    CONSTRAINT ck_partner_location_dates CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to >= effective_from)
);

CREATE INDEX idx_partner_location_partner ON partner_location(partner_id);
CREATE INDEX idx_partner_location_location ON partner_location(location_id);
CREATE INDEX idx_partner_location_status ON partner_location(status);
CREATE UNIQUE INDEX uq_active_primary_partner_location
    ON partner_location(location_id)
    WHERE status = 'ACTIVE' AND relationship_type = 'PRIMARY';

CREATE TABLE partner_user (
    id BIGSERIAL PRIMARY KEY,
    partner_id BIGINT NOT NULL REFERENCES partner(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(160),
    updated_by VARCHAR(160),
    CONSTRAINT uq_partner_user UNIQUE (partner_id, user_id)
);

CREATE INDEX idx_partner_user_partner ON partner_user(partner_id);
CREATE INDEX idx_partner_user_user ON partner_user(user_id);
CREATE INDEX idx_partner_user_active ON partner_user(active);
