ALTER TABLE users
    ADD COLUMN special_day_type VARCHAR(64),
    ADD COLUMN special_day_custom_label VARCHAR(120);

ALTER TABLE whatsapp_otp
    ADD COLUMN registration_special_day_type VARCHAR(64),
    ADD COLUMN registration_special_day_custom_label VARCHAR(120);

UPDATE users
SET special_day_type = 'Other',
    special_day_custom_label = special_date_description
WHERE special_date_description IS NOT NULL
  AND TRIM(special_date_description) <> '';

UPDATE whatsapp_otp
SET registration_special_day_type = 'Other',
    registration_special_day_custom_label = registration_special_date_description
WHERE registration_special_date_description IS NOT NULL
  AND TRIM(registration_special_date_description) <> '';
