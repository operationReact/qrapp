ALTER TABLE locations
    ADD COLUMN code_sequence BIGINT,
    ADD COLUMN code_manually_edited BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE locations
SET code_sequence = CAST((regexp_match(code, '-([0-9]+)$'))[1] AS BIGINT)
WHERE code ~ '-[0-9]+$';

CREATE SEQUENCE IF NOT EXISTS locations_global_code_seq;

SELECT setval(
    'locations_global_code_seq',
    COALESCE((SELECT MAX(code_sequence) FROM locations), 1),
    COALESCE((SELECT MAX(code_sequence) FROM locations), 0) > 0
);
