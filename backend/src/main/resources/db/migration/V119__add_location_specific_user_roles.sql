ALTER TABLE user_location_access
    ADD COLUMN role VARCHAR(30);

UPDATE user_location_access access
SET role = users.role
FROM users
WHERE users.id = access.user_id
  AND access.role IS NULL;

UPDATE user_location_access
SET role = 'CUSTOMER'
WHERE role IS NULL;

ALTER TABLE user_location_access
    ALTER COLUMN role SET NOT NULL;
