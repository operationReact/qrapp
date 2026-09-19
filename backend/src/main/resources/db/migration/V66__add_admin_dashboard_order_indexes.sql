CREATE INDEX IF NOT EXISTS idx_orders_pre_order_status
    ON orders (pre_order, status);

CREATE INDEX IF NOT EXISTS idx_orders_pre_order_completed_at
    ON orders (pre_order, completed_at);
