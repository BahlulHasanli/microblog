-- Add polar_customer_id column to users table
-- Bu sütun Polar-dakı customer ID-ni saxlayır

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS polar_customer_id VARCHAR(255);

-- İndeks əlavə et
CREATE INDEX IF NOT EXISTS idx_users_polar_customer_id ON users(polar_customer_id);

COMMENT ON COLUMN users.polar_customer_id IS 'Polar platformasındakı customer ID';
