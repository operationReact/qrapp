ALTER TABLE locations
    ADD COLUMN country VARCHAR(80) DEFAULT 'India',
    ADD COLUMN address_line_1 VARCHAR(255),
    ADD COLUMN address_line_2 VARCHAR(255),
    ADD COLUMN landmark VARCHAR(160),
    ADD COLUMN city VARCHAR(120),
    ADD COLUMN district VARCHAR(120),
    ADD COLUMN state_ut VARCHAR(120),
    ADD COLUMN pin_code VARCHAR(6),
    ADD COLUMN latitude NUMERIC(10, 7),
    ADD COLUMN longitude NUMERIC(10, 7);

UPDATE locations
SET country = COALESCE(country, 'India'),
    address_line_1 = NULLIF(TRIM(address), '')
WHERE address_line_1 IS NULL;

ALTER TABLE locations
    ALTER COLUMN country SET DEFAULT 'India';
