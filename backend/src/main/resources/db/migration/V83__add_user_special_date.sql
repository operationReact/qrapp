ALTER TABLE users ADD COLUMN special_date DATE;
ALTER TABLE users ADD COLUMN special_date_description VARCHAR(120);
ALTER TABLE whatsapp_otp ADD COLUMN registration_special_date DATE;
ALTER TABLE whatsapp_otp ADD COLUMN registration_special_date_description VARCHAR(120);
