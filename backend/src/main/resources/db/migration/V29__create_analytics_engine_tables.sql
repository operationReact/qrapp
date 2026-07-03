-- =============================================================================
-- V29__create_analytics_engine_tables.sql
--
-- Analytics Engine — materialised snapshot tables.
-- All tables are write-heavy (schedulers) and read-heavy (dashboards).
-- Design principles:
--   • Partial indexes on boolean / enum columns for selective queries.
--   • BRIN indexes on append-only date columns (cheaper than B-Tree for large ranges).
--   • ON CONFLICT DO UPDATE (UPSERT) for idempotent scheduler runs.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. analytics_daily_sales
--    One row per calendar date. Unique on sales_date.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analytics_daily_sales (
    id                   BIGSERIAL     PRIMARY KEY,
    sales_date           DATE          NOT NULL,
    total_orders         INTEGER       NOT NULL DEFAULT 0,
    completed_orders     INTEGER       NOT NULL DEFAULT 0,
    cancelled_orders     INTEGER       NOT NULL DEFAULT 0,
    total_revenue        NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    net_revenue          NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_discount       NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    average_order_value  NUMERIC(10,2),
    unique_customers     INTEGER       NOT NULL DEFAULT 0,
    new_customers        INTEGER       NOT NULL DEFAULT 0,
    total_items_sold     INTEGER       NOT NULL DEFAULT 0,
    wallet_revenue       NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    online_revenue       NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    cod_revenue          NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_analytics_daily_sales_date UNIQUE (sales_date)
);

-- B-Tree on date for range queries (WHERE sales_date BETWEEN ... AND ...)
CREATE INDEX IF NOT EXISTS idx_ads_sales_date
    ON analytics_daily_sales (sales_date DESC);

-- BRIN for large table full-range scans (e.g. yearly reports)
CREATE INDEX IF NOT EXISTS idx_ads_sales_date_brin
    ON analytics_daily_sales USING BRIN (sales_date);

CREATE INDEX IF NOT EXISTS idx_ads_total_revenue
    ON analytics_daily_sales (total_revenue DESC);

COMMENT ON TABLE  analytics_daily_sales                IS 'Materialised daily sales KPI snapshot. Populated nightly by DailyRevenueSnapshotScheduler.';
COMMENT ON COLUMN analytics_daily_sales.sales_date     IS 'Calendar date this row covers (UTC).';
COMMENT ON COLUMN analytics_daily_sales.net_revenue    IS 'Gross revenue minus coupon discounts.';
COMMENT ON COLUMN analytics_daily_sales.new_customers  IS 'Users placing their first-ever order on this date.';


-- ---------------------------------------------------------------------------
-- 2. analytics_hourly_orders
--    One row per (order_date, hour_of_day). Unique on the composite.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analytics_hourly_orders (
    id                      BIGSERIAL     PRIMARY KEY,
    order_date              DATE          NOT NULL,
    hour_of_day             SMALLINT      NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),
    day_of_week             SMALLINT      NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    order_count             INTEGER       NOT NULL DEFAULT 0,
    completed_count         INTEGER       NOT NULL DEFAULT 0,
    hour_revenue            NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    avg_fulfilment_minutes  NUMERIC(6,2),
    created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_analytics_hourly_orders_date_hour UNIQUE (order_date, hour_of_day)
);

CREATE INDEX IF NOT EXISTS idx_aho_order_date
    ON analytics_hourly_orders (order_date DESC);

CREATE INDEX IF NOT EXISTS idx_aho_hour_of_day
    ON analytics_hourly_orders (hour_of_day);

-- Composite for heatmap queries: WHERE order_date BETWEEN x AND y GROUP BY hour_of_day
CREATE INDEX IF NOT EXISTS idx_aho_date_hour
    ON analytics_hourly_orders (order_date, hour_of_day);

COMMENT ON TABLE  analytics_hourly_orders           IS 'Hourly order distribution. One row per (date, hour). Used for peak-hour heatmaps.';
COMMENT ON COLUMN analytics_hourly_orders.day_of_week IS 'ISO-8601: 1=Monday, 7=Sunday.';


-- ---------------------------------------------------------------------------
-- 3. analytics_menu_item
--    One row per (menu_item_id, snapshot_date). Unique on the composite.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analytics_menu_item (
    id               BIGSERIAL      PRIMARY KEY,
    menu_item_id     BIGINT         NOT NULL,
    menu_item_name   VARCHAR(255)   NOT NULL,
    category_id      BIGINT,
    category_name    VARCHAR(100),
    snapshot_date    DATE           NOT NULL,
    total_qty_sold   INTEGER        NOT NULL DEFAULT 0,
    total_revenue    NUMERIC(12,2)  NOT NULL DEFAULT 0.00,
    order_count      INTEGER        NOT NULL DEFAULT 0,
    avg_selling_price NUMERIC(10,2),
    revenue_rank     INTEGER,
    qty_rank         INTEGER,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_analytics_menu_item_date UNIQUE (menu_item_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_ami_snapshot_date
    ON analytics_menu_item (snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_ami_menu_item_id
    ON analytics_menu_item (menu_item_id);

-- For top-N item queries with date range
CREATE INDEX IF NOT EXISTS idx_ami_item_date
    ON analytics_menu_item (menu_item_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_ami_total_revenue
    ON analytics_menu_item (total_revenue DESC);

CREATE INDEX IF NOT EXISTS idx_ami_category_date
    ON analytics_menu_item (category_id, snapshot_date DESC);

COMMENT ON TABLE  analytics_menu_item             IS 'Daily per-item sales snapshot. Powers top-sellers and category dashboards.';
COMMENT ON COLUMN analytics_menu_item.revenue_rank IS 'RANK() by revenue among all items on snapshot_date. 1=highest.';
COMMENT ON COLUMN analytics_menu_item.qty_rank     IS 'RANK() by qty_sold among all items on snapshot_date.';


-- ---------------------------------------------------------------------------
-- 4. analytics_user_preference
--    One row per user_id. Unique on user_id.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analytics_user_preference (
    id                       BIGSERIAL      PRIMARY KEY,
    user_id                  BIGINT         NOT NULL,
    phone                    VARCHAR(20)    NOT NULL,
    total_orders             INTEGER        NOT NULL DEFAULT 0,
    completed_orders         INTEGER        NOT NULL DEFAULT 0,
    cancelled_orders         INTEGER        NOT NULL DEFAULT 0,
    lifetime_spend           NUMERIC(12,2)  NOT NULL DEFAULT 0.00,
    avg_order_value          NUMERIC(10,2),
    max_order_value          NUMERIC(10,2),
    first_order_at           TIMESTAMPTZ,
    last_order_at            TIMESTAMPTZ,
    avg_order_frequency_days NUMERIC(6,2),
    preferred_category_ids   TEXT,                     -- JSON array e.g. [3,1,7]
    preferred_item_ids       TEXT,                     -- JSON array e.g. [12,5,9]
    customer_segment         VARCHAR(20),              -- NEW|OCCASIONAL|REGULAR|VIP|AT_RISK|CHURNED
    is_churned               BOOLEAN        NOT NULL DEFAULT FALSE,
    coupons_used             INTEGER        NOT NULL DEFAULT 0,
    total_coupon_discount    NUMERIC(10,2)  NOT NULL DEFAULT 0.00,
    created_at               TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_analytics_user_pref_user_id UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_aup_user_id
    ON analytics_user_preference (user_id);

CREATE INDEX IF NOT EXISTS idx_aup_last_order_at
    ON analytics_user_preference (last_order_at DESC);

CREATE INDEX IF NOT EXISTS idx_aup_lifetime_spend
    ON analytics_user_preference (lifetime_spend DESC);

-- Partial index — churn queries only scan TRUE rows
CREATE INDEX IF NOT EXISTS idx_aup_is_churned_true
    ON analytics_user_preference (user_id)
    WHERE is_churned = TRUE;

CREATE INDEX IF NOT EXISTS idx_aup_customer_segment
    ON analytics_user_preference (customer_segment);

COMMENT ON TABLE  analytics_user_preference                  IS 'Per-user behavioural snapshot. Drives segmentation and personalisation.';
COMMENT ON COLUMN analytics_user_preference.customer_segment IS 'RFM-derived: NEW, OCCASIONAL, REGULAR, VIP, AT_RISK, CHURNED.';
COMMENT ON COLUMN analytics_user_preference.preferred_category_ids IS 'JSON array of top-3 category IDs by order frequency.';


-- ---------------------------------------------------------------------------
-- 5. analytics_coupon
--    One row per (coupon_code, snapshot_date). Unique on the composite.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analytics_coupon (
    id                      BIGSERIAL      PRIMARY KEY,
    coupon_id               BIGINT         NOT NULL,
    coupon_code             VARCHAR(50)    NOT NULL,
    snapshot_date           DATE           NOT NULL,
    total_redemptions       INTEGER        NOT NULL DEFAULT 0,
    successful_redemptions  INTEGER        NOT NULL DEFAULT 0,
    cancelled_redemptions   INTEGER        NOT NULL DEFAULT 0,
    unique_users            INTEGER        NOT NULL DEFAULT 0,
    total_discount_given    NUMERIC(12,2)  NOT NULL DEFAULT 0.00,
    total_revenue_generated NUMERIC(12,2)  NOT NULL DEFAULT 0.00,
    avg_order_value         NUMERIC(10,2),
    discount_cost_ratio     NUMERIC(6,2),
    repeat_user_count       INTEGER        NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_analytics_coupon_code_date UNIQUE (coupon_code, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_ac_snapshot_date
    ON analytics_coupon (snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_ac_coupon_code
    ON analytics_coupon (coupon_code);

CREATE INDEX IF NOT EXISTS idx_ac_coupon_id
    ON analytics_coupon (coupon_id);

CREATE INDEX IF NOT EXISTS idx_ac_total_redemptions
    ON analytics_coupon (total_redemptions DESC);

CREATE INDEX IF NOT EXISTS idx_ac_total_discount
    ON analytics_coupon (total_discount_given DESC);

-- Partial index — abuse detection queries (repeat_user_count > 0)
CREATE INDEX IF NOT EXISTS idx_ac_abuse_signals
    ON analytics_coupon (coupon_code, snapshot_date)
    WHERE repeat_user_count > 0;

COMMENT ON TABLE  analytics_coupon                      IS 'Daily coupon performance snapshot. Enables ROI and abuse-detection analysis.';
COMMENT ON COLUMN analytics_coupon.discount_cost_ratio  IS 'total_discount_given / total_revenue_generated * 100. Stored as percentage.';
COMMENT ON COLUMN analytics_coupon.repeat_user_count    IS 'Users who redeemed this coupon more than once on this date. Abuse signal.';


-- ---------------------------------------------------------------------------
-- Trigger: auto-update updated_at on all analytics tables
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION analytics_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DO $$ DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'analytics_daily_sales',
        'analytics_hourly_orders',
        'analytics_menu_item',
        'analytics_user_preference',
        'analytics_coupon'
    ] LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%I_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION analytics_set_updated_at()',
            tbl, tbl
        );
    END LOOP;
END $$;

