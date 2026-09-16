CREATE TABLE IF NOT EXISTS whatsapp_webhook_receipt (
    event_key   VARCHAR(128) PRIMARY KEY,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE whatsapp_webhook_receipt IS
    'Legacy webhook receipt table retained for migration history; active processing uses whatsapp_webhook_outbox.';
