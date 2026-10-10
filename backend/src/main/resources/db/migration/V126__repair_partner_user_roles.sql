-- Partner associations created from existing users must authenticate as partner users.
UPDATE users u
SET role = 'PARTNER_ADMIN',
    is_admin = FALSE,
    is_super_user = FALSE
WHERE u.role = 'CUSTOMER'
  AND EXISTS (
      SELECT 1
      FROM partner_user pu
      JOIN partner p ON p.id = pu.partner_id
      WHERE pu.user_id = u.id
        AND pu.active = TRUE
        AND p.status = 'ACTIVE'
  );
