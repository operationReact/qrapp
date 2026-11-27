ALTER TABLE users ADD COLUMN apple_subject VARCHAR(255);
ALTER TABLE users ADD CONSTRAINT uq_users_apple_subject UNIQUE (apple_subject);
