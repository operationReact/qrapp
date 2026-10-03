ALTER TABLE party_orders
    ADD COLUMN IF NOT EXISTS order_type VARCHAR(20);

UPDATE party_orders
SET order_type = 'PARTY'
WHERE order_type IS NULL;

ALTER TABLE party_orders
    ALTER COLUMN order_type SET DEFAULT 'PARTY',
    ALTER COLUMN order_type SET NOT NULL;

ALTER TABLE party_orders
    ADD CONSTRAINT chk_party_order_type
    CHECK (order_type IN ('PARTY', 'BULK'));
