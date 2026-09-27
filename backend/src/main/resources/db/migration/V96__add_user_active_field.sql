-- Add active field to users table to track user status
-- Users assigned to deleted locations will be marked inactive
ALTER TABLE users ADD COLUMN active BOOLEAN NOT NULL DEFAULT true;

-- Create index for active users queries
CREATE INDEX idx_users_active ON users(active);
