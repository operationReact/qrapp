-- Seed the development super admin and its location access.
-- The old phone number is migrated only when the corrected account does not
-- already exist, so this is safe for databases initialized by the old seed.

UPDATE users
SET phone = '7093327979'
WHERE phone = '709327979'
  AND NOT EXISTS (
      SELECT 1
      FROM users
      WHERE phone = '7093327979'
  );

INSERT INTO locations (code, name, is_active)
VALUES ('MEENAKSHI_TOWERS', 'Meenakshi Towers', true)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    is_active = true;

INSERT INTO locations (code, name, is_active)
VALUES ('MINDSPACE', 'Mindspace', true)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    is_active = true;

INSERT INTO users (
    phone,
    password,
    name,
    is_admin,
    is_super_user,
    role,
    default_location_id
)
SELECT
    '7093327979',
    '$2b$10$Hw4XXBpcmZ2KgwEXcv4h6OSTSWZRFVsID2.lYWrHfrABD6WF2g/y6',
    'Satya Varma',
    true,
    true,
    'SUPER_ADMIN',
    id
FROM locations
WHERE code = 'MEENAKSHI_TOWERS'
ON CONFLICT (phone) DO UPDATE
SET name = EXCLUDED.name,
    is_admin = true,
    is_super_user = true,
    role = 'SUPER_ADMIN',
    default_location_id = EXCLUDED.default_location_id;

INSERT INTO wallets (user_id, balance)
SELECT id, 0
FROM users
WHERE phone = '7093327979'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO user_location_access (user_id, location_id, active)
SELECT u.id, l.id, true
FROM users u
CROSS JOIN locations l
WHERE u.phone = '7093327979'
  AND l.code IN ('MEENAKSHI_TOWERS', 'MINDSPACE')
ON CONFLICT (user_id, location_id) DO UPDATE
SET active = true;
