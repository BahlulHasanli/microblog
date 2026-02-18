-- KrossWordle levels cədvəli — admin paneldən dinamik level idarəetmə
CREATE TABLE IF NOT EXISTS krosswordle_levels (
  id BIGSERIAL PRIMARY KEY,
  level_number INTEGER NOT NULL UNIQUE,
  words JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- İndekslər
CREATE INDEX idx_krosswordle_levels_number ON krosswordle_levels(level_number);
CREATE INDEX idx_krosswordle_levels_active ON krosswordle_levels(is_active);

-- RLS
ALTER TABLE krosswordle_levels ENABLE ROW LEVEL SECURITY;

-- Hər kəs aktiv level-ləri oxuya bilər (oyun üçün lazımdır)
CREATE POLICY "Hər kəs aktiv levelləri görə bilər"
  ON krosswordle_levels
  FOR SELECT
  USING (is_active = true);

-- Yalnız admin-lər level yarada/yeniləyə/silə bilər (service role ilə)
CREATE POLICY "Service role tam giriş"
  ON krosswordle_levels
  FOR ALL
  USING (auth.role() = 'service_role');
