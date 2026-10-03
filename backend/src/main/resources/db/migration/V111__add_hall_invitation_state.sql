ALTER TABLE party_orders
    ADD COLUMN IF NOT EXISTS hall_invitation_seen_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS hall_invitation_dismissed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS hall_invitation_accepted_at TIMESTAMPTZ;
