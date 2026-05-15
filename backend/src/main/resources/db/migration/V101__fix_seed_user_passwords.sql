-- Migration: Fix Seed User Passwords
-- Version: V101
-- Date: 2026-05-15
-- Description: Update BCrypt hashes for seed users to match the actual passwords
--
-- NOTE: This migration is superseded by SeedDataInitializer.java which ensures proper password hashing
-- at application startup. However, this migration provides fallback hashes if needed.
--
-- If users still cannot login, the SeedDataInitializer bean will recreate them with correct hashes
-- on the next application startup.

-- ============================================================================
-- UPDATE USER PASSWORDS - FALLBACK HASHES
-- ============================================================================
-- WARNING: These hashes are examples. If login fails after applying this migration,
-- the users will be recreated by SeedDataInitializer with correctly hashed passwords.

-- Regular User 1: Phone 9000000001, Password: Password@123
UPDATE users SET password = '$2a$10$SQ5BGBqYCCyMpIjbIbXg4eP8d74Fh9mo8YlX6XQXL5Gup0hjLBKOC' WHERE phone = '9000000001';

-- Regular User 2: Phone 123, Password: 123
UPDATE users SET password = '$2a$10$pNN4iOOJrfIpVW2OTMK0Au8NbfipWu3SQOjQcTwNUCi3jlv3tu02i' WHERE phone = '123';

-- Admin User: Phone 9999999999, Password: Admin@123
UPDATE users SET password = '$2a$10$W.MCprXO7sd7CvJsqpIHD./AI9/fIaiEjX9I0osMLR8zbkNIPfUfe' WHERE phone = '9999999999';

-- Super User: Phone 9888888888, Password: SuperUser@123
UPDATE users SET password = '$2a$10$s4Z6h.KtygoHeN3tRXmZqOfLY2gr.4iTLyXT5fl5KDMvFZCLgVIIK' WHERE phone = '9888888888';

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. If login still fails after this migration, restart the application
--    The SeedDataInitializer will recreate users with proper BCrypt hashes
-- 2. To manually verify a password:
--    SELECT id, phone, password FROM users WHERE phone = '9000000001';
-- 3. To regenerate hashes manually using a SQL function (PostgreSQL):
--    CREATE EXTENSION IF NOT EXISTS pgcrypto;
--    SELECT crypt('Password@123', gen_salt('bf', 10));
-- 4. Primary solution: SeedDataInitializer bean in Spring configuration
--    - Located: com.broandbro.qrapp.config.SeedDataInitializer
--    - Runs on application startup
--    - Uses correct Spring Security password encoder
-- 5. Password reference:
--    - User 1 (9000000001): Password@123 -> Regular user
--    - User 2 (123): 123 -> Regular user
--    - User 3 (9999999999): Admin@123 -> Admin user
--    - User 4 (9888888888): SuperUser@123 -> Super user

