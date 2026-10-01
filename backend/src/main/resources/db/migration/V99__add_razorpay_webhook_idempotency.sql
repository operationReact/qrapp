CREATE TABLE razorpay_webhook_events (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(100) UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_razorpay_webhook_events_received_at
    ON razorpay_webhook_events(received_at);
