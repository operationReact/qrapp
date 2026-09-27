-- V98__fix_order_number_format_constraint.sql
-- Fix the order_number CHECK constraint to allow underscores in location codes
--
-- The previous migration's constraint was too restrictive:
-- ^[A-Z0-9]+-\d{8}-\d{4}$
-- 
-- This only allowed hyphens but not underscores, which are valid in location codes like PRAGATI_NAGAR
--
-- New constraint allows underscores and hyphens in location code prefix:
-- ^[A-Z0-9_-]+-\d{8}-\d{4}$

-- Drop the old constraint
ALTER TABLE orders
    DROP CONSTRAINT IF EXISTS orders_order_number_format_check;

-- Add the corrected constraint that allows both hyphens and underscores
ALTER TABLE orders
    ADD CONSTRAINT orders_order_number_format_check
    CHECK (order_number IS NULL OR order_number ~ '^[A-Z0-9_-]+-\d{8}-\d{4}$');
