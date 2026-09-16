UPDATE whatsapp_webhook_outbox
SET status = 'COMPLETED'
WHERE status = 'PUBLISHED';

ALTER TABLE whatsapp_webhook_outbox
    DROP CONSTRAINT chk_whatsapp_outbox_status;

ALTER TABLE whatsapp_webhook_outbox
    ADD CONSTRAINT chk_whatsapp_outbox_status
        CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'));

COMMENT ON TABLE whatsapp_webhook_outbox IS
    'Durable Meta WhatsApp queue. Events are retried until business processing completes.';
