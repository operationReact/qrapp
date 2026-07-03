-- V30: Add balance payment fields and DELIVERED status support to party_orders
-- The DELIVERED status is added to the PartyOrderStatus enum (no DB change needed for string enum)
-- New columns: balance_amount, balance_paid, balance_paid_amount, balance_paid_at, delivered_at

ALTER TABLE party_orders
    ADD COLUMN IF NOT EXISTS balance_amount       NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS balance_paid         BOOLEAN      NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS balance_paid_amount  NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS balance_paid_at      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS delivered_at         TIMESTAMPTZ;

