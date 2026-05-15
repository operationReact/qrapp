-- Super User Role Support Migration
-- Version: V15
-- Date: 2026-05-15
-- Description: Add isSuperUser column to users table for coupon creation permission

-- ============================================================================
-- ADD SUPER USER FLAG TO USERS TABLE
-- ============================================================================

ALTER TABLE users ADD COLUMN is_super_user BOOLEAN NOT NULL DEFAULT false;

-- Create index for super user lookups
CREATE INDEX idx_users_is_super_user ON users(is_super_user);

-- ============================================================================
-- ROLE HIERARCHY
-- ============================================================================
-- ROLE_USER: Regular user (can place orders, apply coupons)
-- ROLE_ADMIN: Admin user (can manage existing coupons, view analytics, toggle status)
-- ROLE_SUPERUSER: Super user (can CREATE coupons - highest privilege)
--
-- A super user also has isAdmin=true, so they get:
-- - ROLE_USER
-- - ROLE_ADMIN
-- - ROLE_SUPERUSER
--
-- An admin (not super) has isAdmin=true, isSuperUser=false, so they get:
-- - ROLE_USER
-- - ROLE_ADMIN
--
-- A regular user has isAdmin=false, isSuperUser=false, so they get:
-- - ROLE_USER
-- ============================================================================

-- ============================================================================
-- DEFAULT SUPER USER (auto-created by DataLoader)
-- ============================================================================
-- Phone: 9888888888
-- Password: SuperUser@123 (BCrypt encoded)
-- Token: superuser-token-master
-- IsSuperUser: true
-- IsAdmin: true
-- Roles: ROLE_USER, ROLE_ADMIN, ROLE_SUPERUSER
--
-- This is the ONLY user who can create coupons.
-- ============================================================================

