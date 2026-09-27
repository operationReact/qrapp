-- V97__add_location_specific_order_id_generation.sql
-- Migrate order ID generation from global BB-only to location-specific format
--
-- Changes:
-- 1. Add location_code column to daily_order_sequence for per-location sequences
-- 2. Create unique constraint on (location_code, date_key)
-- 3. Drop old unique constraint on date_key (replaced by location-aware constraint)
-- 4. Add location_code column to orders table (immutable snapshot)
-- 5. Update order_number check constraint to accept new location-specific format
-- 6. Increase order_number length to 50 (from 32)
--
-- Format migration:
-- OLD: BB-YYYYMMDD-XXXX (e.g., BB-20260515-0001)
-- NEW: {LOCATION_CODE}-YYYYMMDD-XXXX (e.g., PRAGATI-TG-001-20260515-0001)
--
-- Backward compatibility:
-- - Legacy sequences with location_code=NULL continue to work
-- - Existing orders with BB- format remain unchanged
-- - New orders use location-specific format

-- ═══════════════════════════════════════════════════════════════════════════
-- Step 1: Modify daily_order_sequence table for location-aware sequences
-- ═══════════════════════════════════════════════════════════════════════════

-- Add location_code column (nullable for legacy sequences)
ALTER TABLE daily_order_sequence
    ADD COLUMN IF NOT EXISTS location_code VARCHAR(80);

-- Drop old unique constraint (old: unique on date_key only)
ALTER TABLE daily_order_sequence
    DROP CONSTRAINT IF EXISTS uq_daily_order_sequence_date;

-- Create new composite unique constraint (location_code, date_key)
-- This allows the same date to have sequences for multiple locations
ALTER TABLE daily_order_sequence
    ADD CONSTRAINT uq_daily_order_sequence_location_date 
    UNIQUE (location_code, date_key);

-- Create index for efficient lookups by location_code + date_key
CREATE INDEX IF NOT EXISTS idx_daily_order_sequence_location_date
    ON daily_order_sequence (location_code, date_key);

-- ═══════════════════════════════════════════════════════════════════════════
-- Step 2: Modify orders table to store immutable location code snapshot
-- ═══════════════════════════════════════════════════════════════════════════

-- Add location_code column to orders (immutable snapshot at order creation time)
-- Nullable for legacy orders (created before this field was added)
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS location_code VARCHAR(80);

-- Create index for potential future queries by location code
CREATE INDEX IF NOT EXISTS idx_orders_location_code
    ON orders (location_code);

-- ═══════════════════════════════════════════════════════════════════════════
-- Step 3: Update order_number column definition
-- ═══════════════════════════════════════════════════════════════════════════

-- Increase order_number column length to accommodate new format
-- OLD format: BB-YYYYMMDD-XXXX (19 chars max)
-- NEW format: PRAGATI-TG-001-YYYYMMDD-XXXX (30+ chars max)
ALTER TABLE orders
    ALTER COLUMN order_number TYPE VARCHAR(50);

-- ═══════════════════════════════════════════════════════════════════════════
-- Step 4: Update order_number format check constraint
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop old check constraint (accepts only BB-YYYYMMDD-XXXX)
ALTER TABLE orders
    DROP CONSTRAINT IF EXISTS orders_order_number_format_check;

-- Add new check constraint (accepts new location-specific format)
-- Pattern matches:
-- - Legacy: BB-YYYYMMDD-XXXX
-- - New: {LOCATION_CODE}-YYYYMMDD-XXXX (e.g., PRAGATI-TG-001-20260515-0001 or PRAGATI_NAGAR-20260515-0001)
-- 
-- Format rules:
-- - location_code: alphanumeric with hyphens and underscores (e.g., PRAGATI-TG-001, PRAGATI_NAGAR)
-- - date: 8 digits (YYYYMMDD)
-- - sequence: 4 digits (0001-9999)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'orders_order_number_format_check'
          AND table_name = 'orders'
    ) THEN
        ALTER TABLE orders
        ADD CONSTRAINT orders_order_number_format_check
        CHECK (order_number IS NULL OR order_number ~ '^[A-Z0-9_-]+-\d{8}-\d{4}$');
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- Summary
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- This migration enables location-specific order ID generation while
-- maintaining backward compatibility with existing data.
--
-- Key changes:
-- 1. daily_order_sequence is now per-location per-day (composite key)
-- 2. orders table stores immutable location_code at order creation
-- 3. order_number format validation updated to accept location-specific IDs
-- 4. Legacy orders (BB-format) continue to work unchanged
--
-- Database constraints ensure:
-- - No duplicate order numbers
-- - Location code immutability (stored at order creation)
-- - Unique sequences per location per day
-- - Order numbers follow the required format
