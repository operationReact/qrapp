-- =============================================================================
-- V32__create_party_orders_table.sql
-- Party order feature: users request catering/party orders, admin submits
-- estimates, and users confirm or reject.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. party_orders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS party_orders (
    id                      BIGSERIAL       PRIMARY KEY,

    -- ── User details (denormalised for fast listing without JOIN) ──────────
    user_id                 BIGINT          NOT NULL
                                REFERENCES users (id) ON DELETE RESTRICT,
    user_phone              VARCHAR(20),
    user_name               VARCHAR(100),

    -- ── Event details ───────────────────────────────────────────────────────
    event_date_time         TIMESTAMP       NOT NULL,
    number_of_people        INTEGER         NOT NULL,
    menu_description        TEXT            NOT NULL,
    venue                   VARCHAR(255),

    -- ── Status & Estimate ───────────────────────────────────────────────────
    status                  VARCHAR(30)     NOT NULL DEFAULT 'PENDING_ESTIMATE',
    estimated_amount        NUMERIC(12, 2),
    currency                VARCHAR(10)     NOT NULL DEFAULT 'INR',
    estimate_note           TEXT,
    estimate_submitted_by   VARCHAR(100),
    estimate_sent_at        TIMESTAMPTZ,
    user_responded_at       TIMESTAMPTZ,

    -- ── Audit ────────────────────────────────────────────────────────────────
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    -- ── Constraints ──────────────────────────────────────────────────────────
    CONSTRAINT chk_party_people_min      CHECK (number_of_people >= 1),
    CONSTRAINT chk_party_amount_positive CHECK (estimated_amount IS NULL OR estimated_amount > 0),
    CONSTRAINT chk_party_status          CHECK (status IN (
        'PENDING_ESTIMATE',
        'ESTIMATE_SENT',
        'CONFIRMED',
        'REJECTED',
        'CANCELLED',
        'COMPLETED'
    ))
);

-- ---------------------------------------------------------------------------
-- 2. Indexes
-- ---------------------------------------------------------------------------

-- Admin listing: all orders newest first
CREATE INDEX IF NOT EXISTS idx_party_orders_created_at
    ON party_orders (created_at DESC);

-- User listing: all orders for a specific user, newest first
CREATE INDEX IF NOT EXISTS idx_party_orders_user_id_created_at
    ON party_orders (user_id, created_at DESC);

-- Admin status filter: e.g. "show all PENDING_ESTIMATE"
CREATE INDEX IF NOT EXISTS idx_party_orders_status
    ON party_orders (status, created_at DESC);

