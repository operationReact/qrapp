ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS user_id BIGINT;

UPDATE orders o
SET user_id = u.id
FROM users u
WHERE o.user_id IS NULL
  AND o.phone IS NOT NULL
  AND u.phone = o.phone;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_orders_user'
          AND table_name = 'orders'
    ) THEN
        ALTER TABLE orders
            ADD CONSTRAINT fk_orders_user
            FOREIGN KEY (user_id) REFERENCES users (id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);

