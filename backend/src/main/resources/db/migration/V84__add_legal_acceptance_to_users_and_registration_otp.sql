ALTER TABLE users ADD COLUMN terms_accepted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN terms_accepted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN terms_version VARCHAR(80);
ALTER TABLE users ADD COLUMN privacy_policy_version VARCHAR(80);

ALTER TABLE whatsapp_otp ADD COLUMN registration_terms_accepted BOOLEAN;
ALTER TABLE whatsapp_otp ADD COLUMN registration_terms_accepted_at TIMESTAMPTZ;
ALTER TABLE whatsapp_otp ADD COLUMN registration_terms_version VARCHAR(80);
ALTER TABLE whatsapp_otp ADD COLUMN registration_privacy_policy_version VARCHAR(80);
