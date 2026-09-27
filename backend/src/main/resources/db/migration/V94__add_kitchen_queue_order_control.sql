-- Enhance order_status_history for Kitchen Queue order-control feature
-- Add explicit reason, action_type, and performed_by_user_id columns

ALTER TABLE order_status_history
  ADD COLUMN IF NOT EXISTS reason VARCHAR(255),
  ADD COLUMN IF NOT EXISTS action_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS performed_by_user_id BIGINT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add index for efficient querying by order_id and performed_at for timeline display
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_performed_at 
  ON order_status_history (order_id, created_at DESC);

-- Add index for efficient querying by user (for audit trail)
CREATE INDEX IF NOT EXISTS idx_order_status_history_performed_by_user 
  ON order_status_history (performed_by_user_id);

-- Update existing records to set created_at from changed_at if not set
UPDATE order_status_history
SET created_at = changed_at
WHERE created_at IS NULL;

-- Make created_at NOT NULL after backfill
ALTER TABLE order_status_history
  ALTER COLUMN created_at SET NOT NULL;
