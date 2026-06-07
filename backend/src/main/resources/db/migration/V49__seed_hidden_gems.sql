-- ============================================================================
-- V49 — Seed Hidden Gem Items for Profitability Analytics
-- ============================================================================
-- Seeds estimated costs on 4 premium menu items (giving ≥60% margin) and
-- directly upserts analytics snapshots across the last 3 weeks so the
-- profitability dashboard immediately surfaces HIGH_MARGIN_LOW_VOLUME
-- ("Hidden Gem") insights without waiting for the nightly scheduler.
--
-- Hidden Gem trigger condition (ProfitabilityServiceImpl):
--   • avg_profit_margin  ≥  60  %  (HIGH_MARGIN_THRESHOLD)
--   • total_qty_sold     >   0  AND  < 20  (HIGH_VOLUME_THRESHOLD)
--
-- Chosen items:
--   Yogurt Fruit Bowl   ₹169  cost ₹45  → 73.4 % margin
--   Chicken Thali       ₹189  cost ₹50  → 73.5 % margin
--   Fried Chicken Pieces₹149  cost ₹40  → 73.2 % margin
--   Chicken Sandwich    ₹119  cost ₹32  → 73.1 % margin
--
-- All ops are idempotent (ON CONFLICT DO UPDATE / DO NOTHING).
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Set estimated costs on the four premium items
--    Only touches rows where estimated_cost is still NULL so that manually
--    set values are never silently overwritten.
-- ---------------------------------------------------------------------------

UPDATE menu_item
SET    estimated_cost = 45.00
WHERE  name           = 'Yogurt Fruit Bowl'
  AND  estimated_cost IS NULL;

UPDATE menu_item
SET    estimated_cost = 50.00
WHERE  name           = 'Chicken Thali'
  AND  estimated_cost IS NULL;

UPDATE menu_item
SET    estimated_cost = 40.00
WHERE  name           = 'Fried Chicken Pieces'
  AND  estimated_cost IS NULL;

UPDATE menu_item
SET    estimated_cost = 32.00
WHERE  name           = 'Chicken Sandwich'
  AND  estimated_cost IS NULL;


-- ---------------------------------------------------------------------------
-- 2. Upsert analytics_menu_item snapshots
--
--    3 snapshot dates × 4 items × 2 qty/date = 6 total units per item
--    across the 30-day window — firmly below the 20-unit threshold.
--
--    Using past dates (7 / 14 / 21 days ago) means the nightly scheduler
--    (which only recomputes yesterday + today) won't overwrite these rows.
-- ---------------------------------------------------------------------------

WITH hidden_gems (item_name, selling_price, cost_price) AS (
    VALUES
        ('Yogurt Fruit Bowl',    169.00, 45.00),
        ('Chicken Thali',        189.00, 50.00),
        ('Fried Chicken Pieces', 149.00, 40.00),
        ('Chicken Sandwich',     119.00, 32.00)
),
snapshot_dates (snapshot_date) AS (
    VALUES
        ((CURRENT_DATE - INTERVAL '7 days' )::date),
        ((CURRENT_DATE - INTERVAL '14 days')::date),
        ((CURRENT_DATE - INTERVAL '21 days')::date)
)
INSERT INTO analytics_menu_item (
    menu_item_id,
    menu_item_name,
    category_id,
    category_name,
    snapshot_date,
    total_qty_sold,
    total_revenue,
    order_count,
    avg_selling_price,
    total_cost,
    total_profit,
    avg_cost_price,
    avg_profit_margin
)
SELECT
    mi.id                                                              AS menu_item_id,
    mi.name                                                            AS menu_item_name,
    mi.category_id,
    c.name                                                             AS category_name,
    sd.snapshot_date,
    2                                                                  AS total_qty_sold,
    (2 * hg.selling_price)                                             AS total_revenue,
    2                                                                  AS order_count,
    hg.selling_price                                                   AS avg_selling_price,
    (2 * hg.cost_price)                                                AS total_cost,
    (2 * (hg.selling_price - hg.cost_price))                           AS total_profit,
    hg.cost_price                                                      AS avg_cost_price,
    ROUND(
        (hg.selling_price - hg.cost_price) / hg.selling_price * 100,
        4
    )                                                                  AS avg_profit_margin
FROM   hidden_gems     hg
JOIN   menu_item       mi  ON  mi.name      = hg.item_name
LEFT   JOIN category   c   ON  c.id         = mi.category_id
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
-- 3. Verification query (informational — Flyway ignores SELECT results)
--    Run this separately in psql to confirm the seed worked:
--
--    SELECT mi.name, ami.snapshot_date, ami.total_qty_sold,
--           ami.avg_profit_margin
--    FROM   analytics_menu_item ami
--    JOIN   menu_item mi ON mi.id = ami.menu_item_id
--    WHERE  mi.name IN ('Yogurt Fruit Bowl','Chicken Thali',
--                       'Fried Chicken Pieces','Chicken Sandwich')
--    ORDER  BY mi.name, ami.snapshot_date DESC;
-- ---------------------------------------------------------------------------

