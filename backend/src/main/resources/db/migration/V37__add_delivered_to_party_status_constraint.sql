-- V37: Add DELIVERED to chk_party_status constraint
-- The V36 migration added balance columns but forgot to update the CHECK constraint.

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
        'DELIVERED',
        'COMPLETED'
    ));

