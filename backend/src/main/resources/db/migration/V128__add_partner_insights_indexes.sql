CREATE INDEX IF NOT EXISTS idx_ula_active_role_location_user
    ON user_location_access (location_id, active, role, user_id);

CREATE INDEX IF NOT EXISTS idx_orders_location_status_created_user
    ON orders (location_id, status, created_at, user_id);
