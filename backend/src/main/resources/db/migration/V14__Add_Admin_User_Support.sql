-- Admin User Support Migration
-- Version: V14
-- Date: 2026-05-15
-- Description: Add isAdmin column to users table for role-based access control

-- ============================================================================
-- ADD ADMIN FLAG TO USERS TABLE
-- ============================================================================

ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

-- Create index for admin lookups
CREATE INDEX idx_users_is_admin ON users(is_admin);

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. is_admin defaults to false for all existing users
-- 2. Admins can manage coupons and other administrative tasks
-- 3. Admin flag is checked in TokenAuthFilter to grant ROLE_ADMIN authority
-- 4. Seed data will create one admin user:
--    - Phone: 9999999999
--    - Password: Admin@123 (BCrypt encoded)
--    - Token: admin-token-superuser
--    - IsAdmin: true

