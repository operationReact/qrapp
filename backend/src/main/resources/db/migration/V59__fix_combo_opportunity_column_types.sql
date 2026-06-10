-- =============================================================================
-- V59__fix_combo_opportunity_column_types.sql
-- Date: 2026-06-10
-- Description: Fix column type mismatch between Hibernate's Integer mapping
--              (int4 / INTEGER) and the SMALLINT (int2) columns created in V58.
--              Hibernate schema-validation rejects int2 when expecting int4.
-- =============================================================================

ALTER TABLE combo_opportunity
    ALTER COLUMN quality_score         TYPE INTEGER,
    ALTER COLUMN attachment_confidence TYPE INTEGER;

