CREATE TABLE hall_of_happiness_submissions (
    id BIGSERIAL PRIMARY KEY,
    party_order_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    consent_accepted BOOLEAN NOT NULL,
    consent_accepted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    terms_version VARCHAR(80) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_hall_submission_party_order
        FOREIGN KEY (party_order_id) REFERENCES party_orders(id),
    CONSTRAINT ck_hall_submission_status
        CHECK (status IN ('PENDING_REVIEW', 'PARTIALLY_MODERATED', 'COMPLETED', 'WITHDRAWN'))
);

CREATE INDEX idx_hall_submission_order
    ON hall_of_happiness_submissions (party_order_id);
CREATE INDEX idx_hall_submission_customer
    ON hall_of_happiness_submissions (customer_id);
CREATE INDEX idx_hall_submission_status
    ON hall_of_happiness_submissions (status);

ALTER TABLE hall_of_happiness_photos
    ADD COLUMN submission_id BIGINT;

ALTER TABLE hall_of_happiness_photos
    ADD CONSTRAINT fk_hall_photo_submission
        FOREIGN KEY (submission_id) REFERENCES hall_of_happiness_submissions(id);

CREATE INDEX idx_hall_photo_submission
    ON hall_of_happiness_photos (submission_id);
