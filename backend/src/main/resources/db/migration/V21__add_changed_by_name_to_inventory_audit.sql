-- V21: Add changed_by_name to inventory_audit for username tracking
-- The existing changed_by column holds the user Long ID (for system linkage)
-- changed_by_name stores the human-readable username / phone for display

ALTER TABLE inventory_audit
    ADD COLUMN changed_by_name VARCHAR(100);

COMMENT ON COLUMN inventory_audit.changed_by_name IS 'Phone/username of the admin who made the change';

