-- V43: Add PRE_ORDERED to the orders_status_check constraint
-- The Java OrderStatus enum now includes PRE_ORDERED for scheduled/advance orders.
-- We must drop and recreate the check constraint to include the new value.

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders
    ADD CONSTRAINT orders_status_check
    CHECK (status IN (
        'PRE_ORDERED',
        'ORDER_PLACED',
        'ACKNOWLEDGED',
        'PREPARING',
        'READY',
        'DELIVERED',
        'COMPLETED',
        'CANCELLED'
    ));

