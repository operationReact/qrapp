-- Customer support requests raised against a specific order (e.g. issues after completion).
CREATE TABLE IF NOT EXISTS order_support_requests (
    id          BIGSERIAL     PRIMARY KEY,
    order_id    BIGINT        NOT NULL REFERENCES orders(id),
    user_id     BIGINT,
    message     VARCHAR(1000) NOT NULL,
    status      VARCHAR(20)   NOT NULL DEFAULT 'OPEN',
    created_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(120)
);

CREATE INDEX IF NOT EXISTS idx_order_support_requests_order
    ON order_support_requests (order_id, status);
