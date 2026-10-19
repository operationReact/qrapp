-- Optimistic locking on orders: concurrent writers (admin, customer, webhook) cannot silently overwrite each other.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

-- Durable refund ledger. One row per refund attempt chain; idempotency_key guarantees at most one cancellation refund per order.
CREATE TABLE IF NOT EXISTS order_refunds (
    id                  BIGSERIAL PRIMARY KEY,
    order_id            BIGINT NOT NULL REFERENCES orders (id),
    amount              NUMERIC(10, 2) NOT NULL,
    method              VARCHAR(20) NOT NULL,
    status              VARCHAR(20) NOT NULL,
    idempotency_key     VARCHAR(120) NOT NULL,
    payment_id          VARCHAR(64),
    provider_refund_id  VARCHAR(120),
    failure_reason      VARCHAR(500),
    attempts            INT NOT NULL DEFAULT 0,
    next_attempt_at     TIMESTAMP,
    created_at          TIMESTAMP NOT NULL,
    updated_at          TIMESTAMP NOT NULL,
    completed_at        TIMESTAMP,
    resolved_by         VARCHAR(120),
    CONSTRAINT uk_order_refunds_idempotency_key UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_order_refunds_status_next ON order_refunds (status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_order_refunds_order ON order_refunds (order_id);

-- At most one OPEN support request per order, enforced by the database rather than only by application checks.
CREATE UNIQUE INDEX IF NOT EXISTS ux_order_support_open_per_order
    ON order_support_requests (order_id) WHERE status = 'OPEN';
