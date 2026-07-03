-- ============================================================================
-- V48 — Product Profitability Tracking
-- ============================================================================
-- Adds estimated_cost to menu_item and profit aggregation columns to
-- analytics_menu_item and analytics_daily_sales.
--
-- Cost resolution priority (also mirrored in application logic):
--   1. order_item.cost_price_snapshot  (vendor-sourced OUTSOURCED/HYBRID items)
--   2. menu_item.estimated_cost        (simple override for SELF_PREPARED items)
--   3. 0                               (fallback when no cost is known)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. menu_item — add estimated_cost
-- ---------------------------------------------------------------------------
ALTER TABLE menu_item
    ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10,2) NULL;

COMMENT ON COLUMN menu_item.estimated_cost IS
    'Optional estimated per-unit production/procurement cost (₹). '
    'Used for profitability calculations on SELF_PREPARED items where '
    'no vendor cost record (vendor_menu_item_cost_history) exists. '
    'Supports future ingredient-level costing roll-up.';

-- ---------------------------------------------------------------------------
-- 2. analytics_menu_item — add per-item profit snapshot columns
-- ---------------------------------------------------------------------------
ALTER TABLE analytics_menu_item
    ADD COLUMN IF NOT EXISTS total_cost          DECIMAL(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_profit        DECIMAL(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS avg_cost_price      DECIMAL(10,2)          NULL,
    ADD COLUMN IF NOT EXISTS avg_profit_margin   DECIMAL(8,4)           NULL;

COMMENT ON COLUMN analytics_menu_item.total_cost IS
    'Aggregate estimated cost = qty × COALESCE(cost_price_snapshot, estimated_cost, 0)';
COMMENT ON COLUMN analytics_menu_item.total_profit IS
    'total_revenue - total_cost';
COMMENT ON COLUMN analytics_menu_item.avg_cost_price IS
    'Weighted average cost price per unit sold on this snapshot_date.';
COMMENT ON COLUMN analytics_menu_item.avg_profit_margin IS
    'Profit margin % = (total_profit / total_revenue) * 100. NULL when no revenue.';

-- ---------------------------------------------------------------------------
-- 3. analytics_daily_sales — add daily profit snapshot columns
-- ---------------------------------------------------------------------------
ALTER TABLE analytics_daily_sales
    ADD COLUMN IF NOT EXISTS total_estimated_cost    DECIMAL(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_estimated_profit  DECIMAL(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS avg_profit_margin       DECIMAL(8,4)           NULL;

COMMENT ON COLUMN analytics_daily_sales.total_estimated_cost IS
    'Sum of COALESCE(cost_price_snapshot, estimated_cost, 0) × qty for all completed orders.';
COMMENT ON COLUMN analytics_daily_sales.total_estimated_profit IS
    'total_revenue - total_estimated_cost';
COMMENT ON COLUMN analytics_daily_sales.avg_profit_margin IS
    'Overall daily profit margin % = (total_estimated_profit / total_revenue) * 100.';

