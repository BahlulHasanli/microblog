-- Support Me Table
-- Bu cədvəl istifadəçilərin yazıçılara etdikləri dəstəkləri saxlayır

CREATE TABLE IF NOT EXISTS support_me (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  polar_checkout_id VARCHAR(255),
  polar_customer_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- İndekslər
CREATE INDEX idx_support_me_supporter ON support_me(supporter_id);
CREATE INDEX idx_support_me_author ON support_me(author_id);
CREATE INDEX idx_support_me_status ON support_me(status);
CREATE INDEX idx_support_me_polar_checkout ON support_me(polar_checkout_id);

-- Updated_at avtomatik yeniləmə üçün trigger
CREATE OR REPLACE FUNCTION update_support_me_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER support_me_updated_at
  BEFORE UPDATE ON support_me
  FOR EACH ROW
  EXECUTE FUNCTION update_support_me_updated_at();

-- RLS (Row Level Security) aktivləşdir
ALTER TABLE support_me ENABLE ROW LEVEL SECURITY;

-- Hər kəs öz dəstəklərini görə bilər
CREATE POLICY "Users can view their own support records"
  ON support_me
  FOR SELECT
  USING (auth.uid() = supporter_id);

-- Yazıçılar özlərinə edilən dəstəkləri görə bilər
CREATE POLICY "Authors can view support received"
  ON support_me
  FOR SELECT
  USING (auth.uid() = author_id);

-- Yalnız sistem dəstək qeydləri yarada bilər (API vasitəsilə)
CREATE POLICY "System can insert support records"
  ON support_me
  FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE support_me IS 'İstifadəçilərin yazıçılara etdikləri dəstəkləri saxlayır';
COMMENT ON COLUMN support_me.supporter_id IS 'Dəstək edən istifadəçinin ID-si';
COMMENT ON COLUMN support_me.author_id IS 'Dəstək alan yazıçının ID-si';
COMMENT ON COLUMN support_me.amount IS 'Dəstək məbləği';
COMMENT ON COLUMN support_me.polar_checkout_id IS 'Polar checkout ID';
COMMENT ON COLUMN support_me.status IS 'Dəstəyin statusu: pending, completed, failed';
