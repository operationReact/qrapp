-- ============================================================================
-- V60 — Fix avg_profit_margin numeric overflow
-- ============================================================================
-- DECIMAL(8,4) only allows values in the range ±9999.9999 (4 integer digits).
-- When total_cost >> total_revenue the computed margin percentage exceeds that
-- bound, causing:
--   ERROR: numeric field overflow
--   Detail: A field with precision 8, scale 4 must round to an absolute value
--           less than 10^4.
--
-- Fix: widen avg_profit_margin to DECIMAL(12,4) on both analytics tables.
--   • 12 total digits, 4 decimal places → integer part up to ±99,999,999
--   • Covers even extreme outlier data (bad estimated_cost entry, etc.)
-- ============================================================================

ALTER TABLE analytics_menu_item
    ALTER COLUMN avg_profit_margin TYPE DECIMAL(12,4);

ALTER TABLE analytics_daily_sales
    ALTER COLUMN avg_profit_margin TYPE DECIMAL(12,4);

