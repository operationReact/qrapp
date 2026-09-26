CREATE INDEX IF NOT EXISTS idx_locations_active ON locations (is_active);
CREATE INDEX IF NOT EXISTS idx_locations_state_ut ON locations (state_ut);
CREATE INDEX IF NOT EXISTS idx_locations_city ON locations (city);
CREATE INDEX IF NOT EXISTS idx_locations_country ON locations (country);
CREATE INDEX IF NOT EXISTS idx_location_customer_company_company
    ON location_customer_company (customer_company_id);
