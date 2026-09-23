-- Backfills user_location_access for existing ADMIN / MANAGER users so they
-- retain access after global location access is narrowed to SUPER_ADMIN only.
--
-- Safety guarantees:
--   * Only users whose role is ADMIN or MANAGER are considered.
--   * A grant is created strictly from a user's own valid default_location_id;
--     the JOIN to locations proves the referenced location exists and the
--     is_active filter keeps out soft-deleted locations. There is NO arbitrary
--     fallback location (unlike the DEFAULT cross-join bootstrap in V67).
--   * Users without a default_location_id are skipped entirely.
--   * ON CONFLICT keeps the operation idempotent and prevents duplicate
--     assignments, leaving any pre-existing grant untouched.
INSERT INTO user_location_access (user_id, location_id, active)
SELECT u.id, u.default_location_id, true
FROM users u
JOIN locations l ON l.id = u.default_location_id
WHERE u.role IN ('ADMIN', 'MANAGER')
  AND u.default_location_id IS NOT NULL
  AND l.is_active = true
ON CONFLICT (user_id, location_id) DO NOTHING;
