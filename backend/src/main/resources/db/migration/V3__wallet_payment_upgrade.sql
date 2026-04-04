ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(32);

UPDATE orders
SET payment_method = COALESCE(payment_method, 'RAZORPAY')
WHERE payment_method IS NULL;

ALTER TABLE wallet_transactions
    ADD COLUMN IF NOT EXISTS provider_order_id VARCHAR(128);

ALTER TABLE wallet_transactions
    ADD COLUMN IF NOT EXISTS order_id BIGINT;

ALTER TABLE wallet_transactions
    ADD COLUMN IF NOT EXISTS description VARCHAR(255);

ALTER TABLE wallet_transactions
    ADD COLUMN IF NOT EXISTS balance_after BIGINT;

UPDATE wallet_transactions
SET description = CASE
    WHEN type = 'CREDIT' THEN 'Wallet top-up'
    ELSE 'Wallet payment'
END
WHERE description IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_wallet_transactions_order'
          AND table_name = 'wallet_transactions'
    ) THEN
        ALTER TABLE wallet_transactions
            ADD CONSTRAINT fk_wallet_transactions_order
            FOREIGN KEY (order_id) REFERENCES orders (id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders (payment_method);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_provider_order_id ON wallet_transactions (provider_order_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_order_id ON wallet_transactions (order_id);

