CREATE TABLE IF NOT EXISTS whatsapp_webhook_outbox (
    id              BIGSERIAL PRIMARY KEY,
    event_key       VARCHAR(128) NOT NULL UNIQUE,
    payload_raw     TEXT NOT NULL,
    event_envelope  TEXT NOT NULL,
    status          VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    attempt_count   INTEGER NOT NULL DEFAULT 0,
    received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    available_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    claimed_by      VARCHAR(128),
    claim_until     TIMESTAMPTZ,
    last_error      TEXT,
    published_at    TIMESTAMPTZ,
    CONSTRAINT chk_whatsapp_outbox_status
        CHECK (status IN ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_pending
    ON whatsapp_webhook_outbox (status, available_at, id);

COMMENT ON TABLE whatsapp_webhook_outbox IS
    'Durable Meta WhatsApp inbox/outbox. Kafka publication is retried until acknowledged.';
