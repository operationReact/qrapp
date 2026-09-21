ALTER TABLE whatsapp_otp ADD COLUMN registration_default_location_id BIGINT;
ALTER TABLE whatsapp_otp ADD CONSTRAINT fk_whatsapp_otp_registration_location
    FOREIGN KEY (registration_default_location_id) REFERENCES locations(id);
