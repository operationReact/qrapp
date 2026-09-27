CREATE TABLE payment_events (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2),
    payment_method VARCHAR(50),
    performed_by_user_id BIGINT,
    performed_by VARCHAR(255),
    reason VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_payment_events_order_id FOREIGN KEY (order_id) REFERENCES orders(id),
    INDEX idx_payment_events_order_id (order_id),
    INDEX idx_payment_events_created_at (created_at)
);
