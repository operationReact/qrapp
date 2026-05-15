/**
 * DEPRECATED: This file has been removed as part of migration from Java-based mock data loading to Flyway SQL migrations.
 *
 * All seed data has been migrated to:
 * - src/main/resources/db/migration/V100__seed_initial_data.sql
 *
 * This class previously implemented CommandLineRunner to seed data on application startup.
 * Flyway now handles all data seeding via versioned SQL migrations which are:
 * - More maintainable
 * - Database-agnostic
 * - Idempotent
 * - Version-controlled
 *
 * @deprecated Replaced by Flyway V100__seed_initial_data.sql migration
 */
package com.broandbro.qrapp;

// File kept as deprecated placeholder - REMOVE THIS FILE after deployment confirmation

