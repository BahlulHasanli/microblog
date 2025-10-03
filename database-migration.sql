-- Admin Panel üçün Database Migration
-- Yalnız users cədvəlinə is_admin sahəsi əlavə edilir
-- Postlar MDX faylları kimi saxlanılır (database-də deyil)

-- Users cədvəlinə is_admin sahəsi əlavə et
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- İlk admin istifadəçi yarat (email-i öz email-inizlə dəyişdirin)
-- UPDATE users SET is_admin = true WHERE email = 'admin@example.com';
