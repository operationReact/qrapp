-- Standardize order statuses to match Java enum values
-- Update legacy "PLACED" status to "ORDER_PLACED"
-- and fix/recreate check constraint if needed

-- Drop existing check constraint on status if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'orders_status_check'
          AND table_name = 'orders'
    ) THEN
        ALTER TABLE orders DROP CONSTRAINT orders_status_check;
    END IF;
END $$;

-- Update legacy "PLACED" status to "ORDER_PLACED"
UPDATE orders
SET status = 'ORDER_PLACED'
WHERE status = 'PLACED';

UPDATE order_status_history
SET new_status = 'ORDER_PLACED'
WHERE new_status = 'PLACED';

UPDATE order_status_history
SET previous_status = 'ORDER_PLACED'
WHERE previous_status = 'PLACED';

-- Add check constraint with all valid OrderStatus enum values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'orders_status_check'
          AND table_name = 'orders'
    ) THEN
        ALTER TABLE orders
        ADD CONSTRAINT orders_status_check
        CHECK (status IN ('ORDER_PLACED', 'ACKNOWLEDGED', 'PREPARING', 'READY', 'DELIVERED', 'COMPLETED', 'CANCELLED'));
    END IF;
END $$;

