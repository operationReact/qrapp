-- V38: Seed the PreOrderOnly tag
-- Menu items assigned tag_id of this tag will appear in the "Pre-Order Only" section on the landing page.

INSERT INTO tag (name)
VALUES ('PreOrderOnly')
ON CONFLICT (name) DO NOTHING;

