-- =============================================================================
-- seed-hidden-gems.sql  —  Standalone seed script (no Flyway required)
-- =============================================================================
-- Run via psql:
--   psql -h <host> -U <user> -d <db> -f scripts/seed-hidden-gems.sql
--
-- Run on the Ops Center (trigger Menu Item Analytics job after running):
--   1. Execute this script
--   2. Go to Admin → Operations Center → Job Control
--   3. Click "Run Now" on "Menu Item Analytics" or "Intraday Menu Analytics"
--
-- What this does:
--   • Sets estimated_cost on 4 premium items to give ≥60% gross margin
--   • Directly upserts analytics_menu_item snapshots so Hidden Gem insights
--     appear immediately in the Profitability dashboard
--
-- Idempotent: safe to run multiple times.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Step 1 — Estimated costs for premium items
-- ---------------------------------------------------------------------------
-- Yogurt Fruit Bowl  ₹169 — cost ₹45 → margin 73.4 %
UPDATE menu_item SET estimated_cost = 45.00
WHERE  name = 'Yogurt Fruit Bowl' AND estimated_cost IS NULL;

-- Chicken Thali  ₹189 — cost ₹50 → margin 73.5 %
UPDATE menu_item SET estimated_cost = 50.00
WHERE  name = 'Chicken Thali' AND estimated_cost IS NULL;

-- Fried Chicken Pieces  ₹149 — cost ₹40 → margin 73.2 %
UPDATE menu_item SET estimated_cost = 40.00
WHERE  name = 'Fried Chicken Pieces' AND estimated_cost IS NULL;

-- Chicken Sandwich  ₹119 — cost ₹32 → margin 73.1 %
UPDATE menu_item SET estimated_cost = 32.00
WHERE  name = 'Chicken Sandwich' AND estimated_cost IS NULL;

-- ---------------------------------------------------------------------------
-- Step 2 — Analytics snapshots  (3 dates × 4 items × 2 qty = 6 sold/item)
-- ---------------------------------------------------------------------------
WITH hidden_gems (item_name, selling_price, cost_price) AS (
    VALUES
        ('Yogurt Fruit Bowl',    169.00::numeric, 45.00::numeric),
        ('Chicken Thali',        189.00::numeric, 50.00::numeric),
        ('Fried Chicken Pieces', 149.00::numeric, 40.00::numeric),
        ('Chicken Sandwich',     119.00::numeric, 32.00::numeric)
),
snapshot_dates (snapshot_date) AS (
    VALUES
        ((CURRENT_DATE - INTERVAL '7 days' )::date),
        ((CURRENT_DATE - INTERVAL '14 days')::date),
        ((CURRENT_DATE - INTERVAL '21 days')::date)
)
INSERT INTO analytics_menu_item (
    menu_item_id, menu_item_name, category_id, category_name,
    snapshot_date, total_qty_sold, total_revenue, order_count,
    avg_selling_price, total_cost, total_profit,
    avg_cost_price, avg_profit_margin
)
SELECT
    mi.id,
    mi.name,
    mi.category_id,
    c.name,
    sd.snapshot_date,
    2                                                                   AS total_qty_sold,
    (2 * hg.selling_price)                                              AS total_revenue,
    2                                                                   AS order_count,
    hg.selling_price                                                    AS avg_selling_price,
    (2 * hg.cost_price)                                                 AS total_cost,
    (2 * (hg.selling_price - hg.cost_price))                            AS total_profit,
    hg.cost_price                                                       AS avg_cost_price,
    ROUND((hg.selling_price - hg.cost_price) / hg.selling_price * 100, 4) AS avg_profit_margin
FROM   hidden_gems     hg
JOIN   menu_item       mi  ON mi.name   = hg.item_name
LEFT   JOIN category   c   ON c.id      = mi.category_id
CROSS  JOIN snapshot_dates sd
ON CONFLICT (menu_item_id, snapshot_date) DO UPDATE
    SET total_qty_sold    = EXCLUDED.total_qty_sold,
        total_revenue     = EXCLUDED.total_revenue,
        order_count       = EXCLUDED.order_count,
        avg_selling_price = EXCLUDED.avg_selling_price,
        total_cost        = EXCLUDED.total_cost,
        total_profit      = EXCLUDED.total_profit,
        avg_cost_price    = EXCLUDED.avg_cost_price,
        avg_profit_margin = EXCLUDED.avg_profit_margin,
        updated_at        = NOW();

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------
SELECT
    mi.name                                          AS item,
    ami.snapshot_date,
    ami.total_qty_sold                               AS qty,
    ami.avg_selling_price                            AS price,
    ami.avg_cost_price                               AS cost,
    ROUND(ami.avg_profit_margin, 1)                  AS "margin_%"
FROM   analytics_menu_item ami
JOIN   menu_item mi ON mi.id = ami.menu_item_id
WHERE  mi.name IN (
    'Yogurt Fruit Bowl', 'Chicken Thali',
    'Fried Chicken Pieces', 'Chicken Sandwich'
)
ORDER  BY mi.name, ami.snapshot_date DESC;

COMMIT;

