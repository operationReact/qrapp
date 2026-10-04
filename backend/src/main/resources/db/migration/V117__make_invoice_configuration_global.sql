DELETE FROM invoice_configurations
WHERE id NOT IN (SELECT MIN(id) FROM invoice_configurations);

ALTER TABLE invoice_configurations
    DROP CONSTRAINT IF EXISTS uk_invoice_configuration_location;

ALTER TABLE invoice_configurations
    DROP CONSTRAINT IF EXISTS invoice_configurations_location_id_fkey;

ALTER TABLE invoice_configurations
    DROP COLUMN IF EXISTS location_id;
