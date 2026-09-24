CREATE TABLE IF NOT EXISTS hall_of_happiness_photos (
    id BIGSERIAL PRIMARY KEY,
    party_order_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    image_url VARCHAR(1000) NOT NULL,
    thumbnail_url VARCHAR(1000) NOT NULL,
    caption VARCHAR(240),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    consent_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    display_order INTEGER NOT NULL DEFAULT 0,
    created_by VARCHAR(100),
    moderated_by VARCHAR(100),
    consent_granted_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    removed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_hall_photo_party_order
        FOREIGN KEY (party_order_id) REFERENCES party_orders(id),
    CONSTRAINT ck_hall_photo_status
        CHECK (status IN ('PENDING', 'APPROVED', 'PUBLISHED', 'REJECTED', 'UNPUBLISHED', 'REMOVED')),
    CONSTRAINT ck_hall_photo_consent
        CHECK (consent_status IN ('PENDING', 'GRANTED', 'REVOKED'))
);

CREATE INDEX IF NOT EXISTS idx_hall_photo_order
    ON hall_of_happiness_photos (party_order_id);
CREATE INDEX IF NOT EXISTS idx_hall_photo_customer
    ON hall_of_happiness_photos (customer_id);
CREATE INDEX IF NOT EXISTS idx_hall_photo_status_consent
    ON hall_of_happiness_photos (status, consent_status);
CREATE INDEX IF NOT EXISTS idx_hall_photo_published
    ON hall_of_happiness_photos (published_at);
