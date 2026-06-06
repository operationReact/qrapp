-- =============================================================================
-- V44 — Migrate Coupon System → Unified Promotion Engine
-- Date     : 2026-06-05
-- Description:
--   Copies every row in the legacy `coupon` table into the `promotion` /
--   `promotion_reward` / `promotion_rule` tables so that all discount logic
--   is served exclusively by the Promotion engine going forward.
--
--   Also migrates coupon_redemption → promotion_usage so that per-user and
--   total usage limits are enforced correctly for all historical codes.
--
--   The `coupon` and `coupon_redemption` tables are kept intact as read-only
--   historical archives. No data is deleted.
-- =============================================================================

-- ── 1. Promote each coupon row into the promotion table ───────────────────────
-- ON CONFLICT DO NOTHING guards against coupons already imported in dev.
INSERT INTO promotion (
    code, title, description,
    promo_type, stack_mode,
    is_active, is_first_order_only,
    starts_at, expires_at,
    total_usage_limit, per_user_limit,
    created_by, updated_by,
    created_at, updated_at
)
SELECT
    c.code,
    c.title,
    c.description,
    'COUPON_CODE',
    'NONE',
    c.is_active,
    c.is_first_order_only,
    c.starts_at,
    c.expires_at,
    c.total_usage_limit,
    c.per_user_limit,
    COALESCE(c.created_by, 'MIGRATION_V44'),
    COALESCE(c.updated_by, 'MIGRATION_V44'),
    COALESCE(c.created_at, NOW()),
    COALESCE(c.updated_at, NOW())
FROM coupon c
ON CONFLICT (code) DO NOTHING;

-- ── 2. Attach a reward to every newly-created promotion ───────────────────────
INSERT INTO promotion_reward (
    promotion_id, reward_type, value, max_cap, created_at, updated_at
)
SELECT
    p.id,
    CASE c.discount_type
        WHEN 'PERCENTAGE' THEN 'PERCENTAGE_DISCOUNT'
        WHEN 'FIXED'      THEN 'FLAT_DISCOUNT'
        ELSE 'FLAT_DISCOUNT'
    END,
    c.discount_value,
    c.max_discount_amount,
    NOW(),
    NOW()
FROM coupon c
JOIN promotion p ON p.code = c.code
WHERE NOT EXISTS (
    SELECT 1 FROM promotion_reward pr WHERE pr.promotion_id = p.id
);

-- ── 3. Attach MIN_ORDER_AMOUNT rules where applicable ─────────────────────────
INSERT INTO promotion_rule (promotion_id, rule_type, params, created_at)
SELECT
    p.id,
    'MIN_ORDER_AMOUNT',
    json_build_object('minAmount', c.min_order_amount)::text,
    NOW()
FROM coupon c
JOIN promotion p ON p.code = c.code
WHERE c.min_order_amount IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM promotion_rule pr
      WHERE pr.promotion_id = p.id AND pr.rule_type = 'MIN_ORDER_AMOUNT'
  );

-- ── 4. Attach TOTAL_USAGE_LIMIT rules where applicable ────────────────────────
INSERT INTO promotion_rule (promotion_id, rule_type, params, created_at)
SELECT p.id, 'TOTAL_USAGE_LIMIT', '{}', NOW()
FROM coupon c
JOIN promotion p ON p.code = c.code
WHERE c.total_usage_limit IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM promotion_rule pr
      WHERE pr.promotion_id = p.id AND pr.rule_type = 'TOTAL_USAGE_LIMIT'
  );

-- ── 5. Attach PER_USER_LIMIT rules where applicable ───────────────────────────
INSERT INTO promotion_rule (promotion_id, rule_type, params, created_at)
SELECT p.id, 'PER_USER_LIMIT', '{}', NOW()
FROM coupon c
JOIN promotion p ON p.code = c.code
WHERE c.per_user_limit IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM promotion_rule pr
      WHERE pr.promotion_id = p.id AND pr.rule_type = 'PER_USER_LIMIT'
  );

-- ── 6. Migrate coupon_redemption → promotion_usage ────────────────────────────
-- Links every historical redemption to its corresponding promotion row.
-- order_subtotal defaults to 0 (not stored in old coupon_redemption table).
INSERT INTO promotion_usage (
    promotion_id, user_id, order_id,
    promotion_code, discount_amount, order_subtotal, redeemed_at
)
SELECT
    p.id,
    cr.user_id,
    cr.order_id,
    c.code,
    cr.discount_amount,
    0,
    cr.redeemed_at
FROM coupon_redemption cr
JOIN coupon           c  ON c.id = cr.coupon_id
JOIN promotion        p  ON p.code = c.code
WHERE NOT EXISTS (
    SELECT 1 FROM promotion_usage pu
    WHERE pu.promotion_id = p.id AND pu.order_id = cr.order_id
);

-- =============================================================================
-- NOTE: coupon and coupon_redemption tables are intentionally left intact.
-- They serve as immutable historical archives. No application code writes to
-- them after this migration.
-- =============================================================================

