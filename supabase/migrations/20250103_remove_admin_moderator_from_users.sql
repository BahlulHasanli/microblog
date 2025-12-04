-- Remove is_admin and is_moderator columns from users table
ALTER TABLE users DROP COLUMN IF EXISTS is_admin;
ALTER TABLE users DROP COLUMN IF EXISTS is_moderator;
