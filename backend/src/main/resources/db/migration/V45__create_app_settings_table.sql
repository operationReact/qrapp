-- V45: App-wide settings table for runtime feature flags and config
CREATE TABLE IF NOT EXISTS app_settings (
    key         VARCHAR(128) PRIMARY KEY,
    value       VARCHAR(1024) NOT NULL,
    description VARCHAR(512),
    updated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Seed: Pay at Stall is DISABLED by default
INSERT INTO app_settings (key, value, description) VALUES
    ('pay_at_stall_enabled', 'false', 'Allow customers to choose "Pay at Stall" at checkout. No money is collected upfront.')
ON CONFLICT (key) DO NOTHING;

