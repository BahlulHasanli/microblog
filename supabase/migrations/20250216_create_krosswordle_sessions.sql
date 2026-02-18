-- KrossWordle session cədvəli — oyun gedişatını server-side saxlamaq üçün
CREATE TABLE IF NOT EXISTS krosswordle_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  play_date DATE NOT NULL,
  level_id INTEGER NOT NULL,
  grid_state JSONB NOT NULL DEFAULT '[]'::jsonb,
  powers_state JSONB NOT NULL DEFAULT '[]'::jsonb,
  elapsed_seconds INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'playing' CHECK (status IN ('playing', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, play_date)
);

-- İndekslər
CREATE INDEX idx_krosswordle_sessions_user_date ON krosswordle_sessions(user_id, play_date);
CREATE INDEX idx_krosswordle_sessions_status ON krosswordle_sessions(status);

-- RLS
ALTER TABLE krosswordle_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "İstifadəçilər öz session-larını görə bilər"
  ON krosswordle_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "İstifadəçilər öz session-larını yarada bilər"
  ON krosswordle_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "İstifadəçilər öz session-larını yeniləyə bilər"
  ON krosswordle_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
