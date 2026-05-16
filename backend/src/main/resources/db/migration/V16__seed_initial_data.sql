-- Flyway Versioned Migration: Initial Seed Data
-- File: V16__seed_initial_data.sql
-- Date: 2026-05-15
-- Description: Seeds initial bootstrap data for development and testing
-- This versioned migration runs ONLY ONCE during the first deployment
-- All inserts are idempotent using ON CONFLICT DO NOTHING
-- No destructive operations (DELETE, TRUNCATE) are used

-- ============================================================================
-- SEED CATEGORIES
-- ============================================================================
-- Categories for organizing menu items
-- All inserts use ON CONFLICT DO NOTHING for idempotency
INSERT INTO category (id, name, description) VALUES
(1, 'Breakfast Specials', 'Healthy breakfast options to start your day')
ON CONFLICT (id) DO NOTHING;

INSERT INTO category (id, name, description) VALUES
(2, 'Lunch Meals', 'Full meal combinations for lunch')
ON CONFLICT (id) DO NOTHING;

INSERT INTO category (id, name, description) VALUES
(3, 'Sandwiches', 'Variety of delicious sandwiches')
ON CONFLICT (id) DO NOTHING;

INSERT INTO category (id, name, description) VALUES
(4, 'Maggi Corner', 'Instant noodle dishes')
ON CONFLICT (id) DO NOTHING;

INSERT INTO category (id, name, description) VALUES
(5, 'Fresh & Healthy Bowls', 'Nutritious bowl options')
ON CONFLICT (id) DO NOTHING;

INSERT INTO category (id, name, description) VALUES
(6, 'Dosa Corner', 'South Indian dosa varieties')
ON CONFLICT (id) DO NOTHING;

INSERT INTO category (id, name, description) VALUES
(7, 'Sides', 'Side dishes and extras')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SEED TAGS
-- ============================================================================
-- Tags for classifying menu items (e.g., Spicy, Veg, etc.)
INSERT INTO tag (id, name) VALUES (1, 'Spicy')
ON CONFLICT (id) DO NOTHING;

INSERT INTO tag (id, name) VALUES (2, 'Mild')
ON CONFLICT (id) DO NOTHING;

INSERT INTO tag (id, name) VALUES (3, 'Sweet')
ON CONFLICT (id) DO NOTHING;

INSERT INTO tag (id, name) VALUES (4, 'Savory')
ON CONFLICT (id) DO NOTHING;

INSERT INTO tag (id, name) VALUES (5, 'Premium')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SEED SHOP
-- ============================================================================
-- Single shop entity: Bro & Bro Kitchen
INSERT INTO shop (id, shop_name, phone_number, alternate_phone_number, address, is_active, created_at, updated_at, version) VALUES
(1, 'Bro & Bro', '9000000000', '9000000001', '123 Main Street, Food Court', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SEED MENU ITEMS
-- ============================================================================
-- Menu items organized by category
-- Image URLs are from Unsplash for demo purposes
-- Prices in decimal format

-- Breakfast Specials (Category ID: 1)
INSERT INTO menu_item (id, name, price, base_price, margin, category_id, tag_id, shop_id, available, recommended, description, image_url, is_veg) VALUES
(1, 'Healthy Oat Meal', 99.00, 99.00, 0.00, 1, 2, 1, true, true, '', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_item (id, name, price, base_price, margin, category_id, tag_id, shop_id, available, recommended, description, image_url, is_veg) VALUES
(2, 'Oats Banana Smoothie', 89.00, 89.00, 0.00, 1, 2, 1, true, true, '', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_item (id, name, price, base_price, margin, category_id, tag_id, shop_id, available, recommended, description, image_url, is_veg) VALUES
(3, 'Peanut Butter Toast', 89.00, 89.00, 0.00, 1, 4, 1, true, false, '', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_item (id, name, price, base_price, margin, category_id, tag_id, shop_id, available, recommended, description, image_url, is_veg) VALUES
(4, 'Puri Bhaji', 49.00, 49.00, 0.00, 1, 1, 1, true, false, '', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80', true)
ON CONFLICT (id) DO NOTHING;

-- Lunch Meals (Category ID: 2)
INSERT INTO menu_item (id, name, price, base_price, margin, category_id, tag_id, shop_id, available, recommended, description, image_url, is_veg) VALUES
(5, 'Combo Meal', 99.00, 99.00, 0.00, 2, 4, 1, true, false, '', 'https://images.unsplash.com/photo-1604908177522-3b8de1df1dd8?auto=format&fit=crop&w=800&q=80', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_item (id, name, price, base_price, margin, category_id, tag_id, shop_id, available, recommended, description, image_url, is_veg) VALUES
(6, 'Chapathi Combo', 99.00, 99.00, 0.00, 2, 4, 1, true, false, '', 'https://images.unsplash.com/photo-1604908177522-3b8de1df1dd8?auto=format&fit=crop&w=800&q=80', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_item (id, name, price, base_price, margin, category_id, tag_id, shop_id, available, recommended, description, image_url, is_veg) VALUES
(7, 'Mini Thali', 129.00, 129.00, 0.00, 2, 4, 1, true, false, '', 'https://images.unsplash.com/photo-1604908177522-3b8de1df1dd8?auto=format&fit=crop&w=800&q=80', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_item (id, name, price, base_price, margin, category_id, tag_id, shop_id, available, recommended, description, image_url, is_veg) VALUES
(8, 'Full Meal Thali', 159.00, 159.00, 0.00, 2, 4, 1, true, false, '', 'https://images.unsplash.com/photo-1604908177522-3b8de1df1dd8?auto=format&fit=crop&w=800&q=80', true)
ON CONFLICT (id) DO NOTHING;

-- Sandwiches (Category ID: 3)
INSERT INTO menu_item (id, name, price, base_price, margin, category_id, tag_id, shop_id, available, recommended, description, image_url, is_veg) VALUES
(9, 'Veg Cheese Sandwich', 69.00, 69.00, 0.00, 3, 2, 1, true, true, '', 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_item (id, name, price, base_price, margin, category_id, tag_id, shop_id, available, recommended, description, image_url, is_veg) VALUES
(10, 'Paneer Cheese Sandwich', 89.00, 89.00, 0.00, 3, 4, 1, true, false, '', 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_item (id, name, price, base_price, margin, category_id, tag_id, shop_id, available, recommended, description, image_url, is_veg) VALUES
(11, 'Corn Cheese Sandwich', 79.00, 79.00, 0.00, 3, 4, 1, true, false, '', 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_item (id, name, price, base_price, margin, category_id, tag_id, shop_id, available, recommended, description, image_url, is_veg) VALUES
(12, 'Corn Sandwich', 69.00, 69.00, 0.00, 3, 2, 1, true, false, '', 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_item (id, name, price, base_price, margin, category_id, tag_id, shop_id, available, recommended, description, image_url, is_veg) VALUES
(13, 'Cheese Sandwich', 49.00, 49.00, 0.00, 3, 4, 1, true, false, '', 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80', true)
ON CONFLICT (id) DO NOTHING;

-- Maggi Corner (Category ID: 4)
INSERT INTO menu_item (id, name, price, base_price, margin, category_id, tag_id, shop_id, available, recommended, description, image_url, is_veg) VALUES
(14, 'Fried Maggi', 69.00, 69.00, 0.00, 4, 1, 1, true, false, '', 'https://images.unsplash.com/photo-1604908177522-3b8de1df1dd8?auto=format&fit=crop&w=800&q=80', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_item (id, name, price, base_price, margin, category_id, tag_id, shop_id, available, recommended, description, image_url, is_veg) VALUES
(15, 'Veg Maggi', 59.00, 59.00, 0.00, 4, 2, 1, true, true, '', 'https://images.unsplash.com/photo-1604908177522-3b8de1df1dd8?auto=format&fit=crop&w=800&q=80', true)
ON CONFLICT (id) DO NOTHING;

-- Fresh & Healthy Bowls (Category ID: 5)
INSERT INTO menu_item (id, name, price, base_price, margin, category_id, tag_id, shop_id, available, recommended, description, image_url, is_veg) VALUES
(16, 'Sweet Corn Cup', 59.00, 59.00, 0.00, 5, 2, 1, true, true, '', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_item (id, name, price, base_price, margin, category_id, tag_id, shop_id, available, recommended, description, image_url, is_veg) VALUES
(17, 'Sprouts Chaat', 79.00, 79.00, 0.00, 5, 1, 1, true, false, '', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_item (id, name, price, base_price, margin, category_id, tag_id, shop_id, available, recommended, description, image_url, is_veg) VALUES
(18, 'Fruit Bowl', 49.00, 49.00, 0.00, 5, 3, 1, true, false, '', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_item (id, name, price, base_price, margin, category_id, tag_id, shop_id, available, recommended, description, image_url, is_veg) VALUES
(19, 'Yogurt Fruit Bowl', 169.00, 169.00, 0.00, 5, 4, 1, true, false, '', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80', true)
ON CONFLICT (id) DO NOTHING;

-- Dosa Corner (Category ID: 6)
INSERT INTO menu_item (id, name, price, base_price, margin, category_id, tag_id, shop_id, available, recommended, description, image_url, is_veg) VALUES
(20, 'Plain Dosa', 39.00, 39.00, 0.00, 6, 2, 1, true, false, '', 'https://images.unsplash.com/photo-1604908177522-3b8de1df1dd8?auto=format&fit=crop&w=800&q=80', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_item (id, name, price, base_price, margin, category_id, tag_id, shop_id, available, recommended, description, image_url, is_veg) VALUES
(21, 'Onion Dosa', 49.00, 49.00, 0.00, 6, 2, 1, true, false, '', 'https://images.unsplash.com/photo-1604908177522-3b8de1df1dd8?auto=format&fit=crop&w=800&q=80', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_item (id, name, price, base_price, margin, category_id, tag_id, shop_id, available, recommended, description, image_url, is_veg) VALUES
(22, 'Ghee Dosa', 49.00, 49.00, 0.00, 6, 4, 1, true, false, '', 'https://images.unsplash.com/photo-1604908177522-3b8de1df1dd8?auto=format&fit=crop&w=800&q=80', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_item (id, name, price, base_price, margin, category_id, tag_id, shop_id, available, recommended, description, image_url, is_veg) VALUES
(23, 'Karam Dosa', 49.00, 49.00, 0.00, 6, 1, 1, true, false, '', 'https://images.unsplash.com/photo-1604908177522-3b8de1df1dd8?auto=format&fit=crop&w=800&q=80', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_item (id, name, price, base_price, margin, category_id, tag_id, shop_id, available, recommended, description, image_url, is_veg) VALUES
(24, 'Masala Dosa', 59.00, 59.00, 0.00, 6, 1, 1, true, false, '', 'https://images.unsplash.com/photo-1604908177522-3b8de1df1dd8?auto=format&fit=crop&w=800&q=80', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_item (id, name, price, base_price, margin, category_id, tag_id, shop_id, available, recommended, description, image_url, is_veg) VALUES
(25, 'Ghee Karam Dosa', 59.00, 59.00, 0.00, 6, 1, 1, true, false, '', 'https://images.unsplash.com/photo-1604908177522-3b8de1df1dd8?auto=format&fit=crop&w=800&q=80', true)
ON CONFLICT (id) DO NOTHING;

-- Special Items (Non-Veg)
INSERT INTO menu_item (id, name, price, base_price, margin, category_id, tag_id, shop_id, available, recommended, description, image_url, is_veg) VALUES
(26, 'Chicken Sandwich', 119.00, 119.00, 0.00, 3, 4, 1, true, true, 'Grilled chicken with mayo', 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_item (id, name, price, base_price, margin, category_id, tag_id, shop_id, available, recommended, description, image_url, is_veg) VALUES
(27, 'Chicken Thali', 189.00, 189.00, 0.00, 2, 5, 1, true, false, 'Rice, curry and grilled chicken', 'https://images.unsplash.com/photo-1604908177522-3b8de1df1dd8?auto=format&fit=crop&w=800&q=80', false)
ON CONFLICT (id) DO NOTHING;

-- Sides (Category ID: 7)
INSERT INTO menu_item (id, name, price, base_price, margin, category_id, tag_id, shop_id, available, recommended, description, image_url, is_veg) VALUES
(28, 'Fried Chicken Pieces', 149.00, 149.00, 0.00, 7, 1, 1, true, false, 'Crispy fried chicken', 'https://images.unsplash.com/photo-1542834369-f10ebf06d3fb?auto=format&fit=crop&w=800&q=80', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SEED USERS
-- ============================================================================
-- Users with BCrypt encoded passwords
-- Password encoding details:
-- - Regular User 1 (9000000001): Password@123
--   BCrypt: $2a$10$slYQmyNdGzin7olVN3p5Be7DFH0KpZbP6H8KwkIVfZgYpHxsB3FYm
-- - Regular User 2 (123): 123
--   BCrypt: $2a$10$VEu3BxIbTi1rp.E7CEu6SOJkHmJEWbCQKVi1r/yFQjVCDfEHp4Z5G
-- - Admin User (9999999999): Admin@123
--   BCrypt: $2a$10$8pW7LjHKYIvH5VPgz7ELs.rqZZrGUCZOm.QCgXv6bCvA2FX6wXiK2
-- - Super User (9888888888): SuperUser@123
--   BCrypt: $2a$10$NEh9o7xrJG9eRZ4wSUJBsO4F0qT7x0rFBMQM.Kf8PkOr0v3zEMU4W

INSERT INTO users (id, phone, password, name, token, created_at, is_admin, is_super_user) VALUES
(1, '9000000001', '$2a$10$slYQmyNdGzin7olVN3p5Be7DFH0KpZbP6H8KwkIVfZgYpHxsB3FYm', 'Aarav', 'mock-token-user-1', CURRENT_TIMESTAMP - INTERVAL '1 day', false, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, phone, password, name, token, created_at, is_admin, is_super_user) VALUES
(2, '123', '$2a$10$VEu3BxIbTi1rp.E7CEu6SOJkHmJEWbCQKVi1r/yFQjVCDfEHp4Z5G', 'Aarav', 'mock-token-user-3', CURRENT_TIMESTAMP - INTERVAL '1 day', false, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, phone, password, name, token, created_at, is_admin, is_super_user) VALUES
(3, '9999999999', '$2a$10$8pW7LjHKYIvH5VPgz7ELs.rqZZrGUCZOm.QCgXv6bCvA2FX6wXiK2', 'Admin User', 'admin-token-superuser', CURRENT_TIMESTAMP - INTERVAL '1 day', true, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, phone, password, name, token, created_at, is_admin, is_super_user) VALUES
(4, '9888888888', '$2a$10$NEh9o7xrJG9eRZ4wSUJBsO4F0qT7x0rFBMQM.Kf8PkOr0v3zEMU4W', 'Super User', 'superuser-token-master', CURRENT_TIMESTAMP - INTERVAL '1 day', true, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SEED WALLETS
-- ============================================================================
-- One wallet per user with initial balance
-- User 1 has 15000 paise (₹150), others have 7200 paise (₹72)

INSERT INTO wallets (id, user_id, balance) VALUES (1, 1, 15000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO wallets (id, user_id, balance) VALUES (2, 2, 7200)
ON CONFLICT (id) DO NOTHING;

INSERT INTO wallets (id, user_id, balance) VALUES (3, 3, 7200)
ON CONFLICT (id) DO NOTHING;

INSERT INTO wallets (id, user_id, balance) VALUES (4, 4, 7200)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SEED WALLET TRANSACTIONS
-- ============================================================================
-- Transaction history for users showing credit and debit operations
-- Note: INTERVAL syntax is PostgreSQL specific

INSERT INTO wallet_transactions (id, wallet_id, amount, type, status, reference_id, created_at) VALUES
(1, 1, 20000, 'CREDIT', 'SUCCESS', 'mock-credit-001', CURRENT_TIMESTAMP - INTERVAL '68000 seconds')
ON CONFLICT (id) DO NOTHING;

INSERT INTO wallet_transactions (id, wallet_id, amount, type, status, reference_id, created_at) VALUES
(2, 1, 5000, 'DEBIT', 'SUCCESS', 'mock-debit-001', CURRENT_TIMESTAMP - INTERVAL '30000 seconds')
ON CONFLICT (id) DO NOTHING;

INSERT INTO wallet_transactions (id, wallet_id, amount, type, status, reference_id, created_at) VALUES
(3, 2, 10000, 'CREDIT', 'SUCCESS', 'mock-credit-002', CURRENT_TIMESTAMP - INTERVAL '54000 seconds')
ON CONFLICT (id) DO NOTHING;

INSERT INTO wallet_transactions (id, wallet_id, amount, type, status, reference_id, created_at) VALUES
(4, 2, 2800, 'DEBIT', 'PENDING', 'mock-debit-002', CURRENT_TIMESTAMP - INTERVAL '8000 seconds')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SEED ORDERS
-- ============================================================================
-- Sample orders in various statuses for different users
-- Order status values: ORDER_PLACED, READY, COMPLETED, CANCELLED
-- Payment status values: PENDING, PAID, FAILED

INSERT INTO orders (id, user_id, phone, status, payment_status, razorpay_order_id, created_at) VALUES
(1, 1, '9000000001', 'COMPLETED', 'PAID', 'order_mock_001', CURRENT_TIMESTAMP - INTERVAL '5 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO orders (id, user_id, phone, status, payment_status, razorpay_order_id, created_at) VALUES
(2, 1, '9000000001', 'READY', 'PAID', 'order_mock_002', CURRENT_TIMESTAMP - INTERVAL '2 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO orders (id, user_id, phone, status, payment_status, razorpay_order_id, created_at) VALUES
(3, 2, '123', 'ORDER_PLACED', 'PENDING', 'order_mock_003', CURRENT_TIMESTAMP - INTERVAL '30 minutes')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SEED ORDER ITEMS
-- ============================================================================
-- Items within each order with quantities
-- Links orders to specific menu items

INSERT INTO order_item (id, order_id, item_id, quantity) VALUES (1, 1, 1, 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_item (id, order_id, item_id, quantity) VALUES (2, 1, 9, 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_item (id, order_id, item_id, quantity) VALUES (3, 2, 5, 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_item (id, order_id, item_id, quantity) VALUES (4, 2, 15, 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_item (id, order_id, item_id, quantity) VALUES (5, 3, 20, 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_item (id, order_id, item_id, quantity) VALUES (6, 3, 25, 1)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
-- 1. All seed data is inserted in dependency order (parent before child)
-- 2. All inserts use ON CONFLICT (id) DO NOTHING for idempotency
-- 3. Foreign key constraints are respected in insertion order
-- 4. Timestamps use CURRENT_TIMESTAMP with INTERVAL for relative times (PostgreSQL syntax)
-- 5. BCrypt encoded passwords match the encoder used in Spring Security
-- 6. This is a VERSIONED migration (V100__) - runs ONLY ONCE during initial deployment
-- 7. NO DESTRUCTIVE operations (DELETE/TRUNCATE) are used - safe for multiple deployments
-- 8. All data is PostgreSQL compatible - no MySQL-specific syntax
-- 9. No environment-specific assumptions - works for dev, test, and production
-- 10. Explicit IDs are used for referential integrity and data stability
-- ============================================================================

