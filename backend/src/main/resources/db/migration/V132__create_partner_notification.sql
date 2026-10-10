-- In-app partner notifications. Created empty; rows appear only when settlement events occur.
CREATE TABLE partner_notification (
    id BIGSERIAL PRIMARY KEY,
    partner_id BIGINT NOT NULL REFERENCES partner(id),
    partner_user_id BIGINT REFERENCES partner_user(id),
    event_type VARCHAR(40) NOT NULL,
    title VARCHAR(160) NOT NULL,
    message VARCHAR(500) NOT NULL,
    target_path VARCHAR(255),
    entity_id BIGINT,
    event_key VARCHAR(120) NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_partner_notification_event UNIQUE (partner_id, partner_user_id, event_key),
    CONSTRAINT ck_partner_notification_event_type CHECK (event_type IN
        ('SETTLEMENT_CREATED', 'SETTLEMENT_CALCULATED', 'SETTLEMENT_APPROVED', 'SETTLEMENT_PAID'))
);

CREATE UNIQUE INDEX uq_partner_notification_broadcast_event
    ON partner_notification(partner_id, event_key) WHERE partner_user_id IS NULL;

CREATE INDEX idx_partner_notification_user_created
    ON partner_notification(partner_user_id, created_at DESC, id DESC);

CREATE INDEX idx_partner_notification_user_unread
    ON partner_notification(partner_user_id) WHERE read_at IS NULL;
