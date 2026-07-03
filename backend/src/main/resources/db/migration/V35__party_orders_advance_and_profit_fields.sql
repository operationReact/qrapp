-- =============================================================================
-- V35__party_orders_advance_and_profit_fields.sql
-- Add advance payment tracking, profit fields, expiry, admin_notes,
-- budget_amount, and ADVANCE_PENDING / ESTIMATE_EXPIRED status values.
-- =============================================================================

-- ── 1. party_orders: new columns ────────────────────────────────────────────

ALTER TABLE party_orders
    ADD COLUMN IF NOT EXISTS budget_amount              NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS estimated_total_amount     NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS estimated_total_expense    NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS estimated_total_profit     NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS admin_notes                TEXT,
    ADD COLUMN IF NOT EXISTS estimate_expires_at        TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS advance_required_amount    NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS advance_paid_amount        NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS advance_paid               BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS advance_paid_at            TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS confirmation_started_at    TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS event_countdown_started    BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS callback_requested         BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 2. Widen status CHECK to include new values ──────────────────────────────

ALTER TABLE party_orders
    DROP CONSTRAINT IF EXISTS chk_party_status;

ALTER TABLE party_orders
    ADD CONSTRAINT chk_party_status CHECK (status IN (
        'NEW',
        'UNDER_REVIEW',
        'PENDING_ESTIMATE',
        'ESTIMATE_SENT',
        'ESTIMATE_EXPIRED',
        'ADVANCE_PENDING',
        'CONFIRMED',
        'REJECTED',
        'CANCELLED',
        'COMPLETED'
    ));

-- ── 3. party_order_menu_items: add pricing columns ───────────────────────────

ALTER TABLE party_order_menu_items
    ADD COLUMN IF NOT EXISTS notes              TEXT,
    ADD COLUMN IF NOT EXISTS quoted_price       NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS estimated_cost     NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS estimated_profit   NUMERIC(12, 2);

-- ── 4. Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_party_orders_status_created
    ON party_orders (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_party_orders_estimate_expires
    ON party_orders (estimate_expires_at)
    WHERE estimate_expires_at IS NOT NULL;

