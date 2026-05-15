-- Coupon System Migration
-- Version: V13
-- Date: 2026-05-15
-- Description: Create coupon and coupon_redemption tables for the flexible coupon engine

-- ============================================================================
-- CREATE COUPON TABLE
-- Master coupon configuration
-- ============================================================================

CREATE TABLE coupon (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(100) NOT NULL,
    description VARCHAR(500),

    -- Discount type: PERCENTAGE, FLAT, FREE_ITEM, FREE_DELIVERY
    discount_type VARCHAR(20) NOT NULL,

    -- Discount value
    -- For PERCENTAGE: 0-100 (e.g., 20 = 20%)
    -- For FLAT: amount (e.g., 50 = ₹50)
    -- For FREE_ITEM/FREE_DELIVERY: 1
    discount_value NUMERIC(10, 2) NOT NULL,

    -- Minimum order amount required to apply coupon (null = no minimum)
    min_order_amount NUMERIC(10, 2),

    -- Maximum discount cap for percentage coupons (null = no cap)
    max_discount_amount NUMERIC(10, 2),

    -- Coupon validity windows
    starts_at TIMESTAMP,
    expires_at TIMESTAMP,

    -- Usage limits
    total_usage_limit INTEGER,     -- Total times can be used (null = unlimited)
    per_user_limit INTEGER,        -- Max uses per user (null = unlimited)

    -- Business rules
    is_first_order_only BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Audit fields
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for coupon table
CREATE INDEX idx_coupon_code ON coupon(code);
CREATE INDEX idx_coupon_is_active ON coupon(is_active);
CREATE INDEX idx_coupon_expires_at ON coupon(expires_at);
CREATE INDEX idx_coupon_starts_at ON coupon(starts_at);

-- ============================================================================
-- CREATE COUPON_REDEMPTION TABLE
-- Tracks every coupon usage for limit enforcement and audit
-- ============================================================================

CREATE TABLE coupon_redemption (
    id BIGSERIAL PRIMARY KEY,
    coupon_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    order_id BIGINT NOT NULL,

    -- Final discount amount applied (locked-in value)
    discount_amount NUMERIC(10, 2) NOT NULL,

    -- Timestamp of redemption
    redeemed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys
    CONSTRAINT fk_coupon_redemption_coupon
        FOREIGN KEY (coupon_id) REFERENCES coupon(id) ON DELETE CASCADE,
    CONSTRAINT fk_coupon_redemption_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_coupon_redemption_order
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Create indexes for coupon_redemption table
CREATE INDEX idx_coupon_redemption_coupon_id ON coupon_redemption(coupon_id);
CREATE INDEX idx_coupon_redemption_user_id ON coupon_redemption(user_id);
CREATE INDEX idx_coupon_redemption_order_id ON coupon_redemption(order_id);
CREATE INDEX idx_coupon_redemption_redeemed_at ON coupon_redemption(redeemed_at);
CREATE INDEX idx_coupon_redemption_coupon_user ON coupon_redemption(coupon_id, user_id);

-- ============================================================================
-- ALTER ORDERS TABLE TO ADD COUPON FIELDS
-- Store final discount values to prevent recalculation
-- ============================================================================

ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(50);
ALTER TABLE orders ADD COLUMN coupon_discount NUMERIC(10, 2);
ALTER TABLE orders ADD COLUMN subtotal NUMERIC(10, 2);
ALTER TABLE orders ADD COLUMN tax NUMERIC(10, 2);
ALTER TABLE orders ADD COLUMN grand_total NUMERIC(10, 2);

-- Create indexes on order coupon fields for analytics
CREATE INDEX idx_orders_coupon_code ON orders(coupon_code);
CREATE INDEX idx_orders_grand_total ON orders(grand_total);

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Coupon codes are stored in uppercase for case-insensitive matching
-- 2. Discount amounts are in smallest currency unit (paise for INR)
-- 3. The coupon_redemption table is CRITICAL for:
--    - Enforcing total_usage_limit
--    - Enforcing per_user_limit
--    - Auditing and fraud detection
--    - Analytics on coupon effectiveness
-- 4. Never recalculate coupon discount after order placement
--    Final values are locked in orders table
-- 5. Discount is applied BEFORE tax calculation:
--    taxable_amount = subtotal - coupon_discount
--    tax = taxable_amount * tax_rate
--    grand_total = subtotal - coupon_discount + tax

