-- KrossWordle score cədvəli
CREATE TABLE IF NOT EXISTS krosswordle_scores (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  level_id INTEGER NOT NULL,
  play_date DATE NOT NULL,
  completion_time INTEGER NOT NULL, -- saniyə ilə
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, play_date)
);

-- İndekslər
CREATE INDEX idx_krosswordle_scores_user_id ON krosswordle_scores(user_id);
CREATE INDEX idx_krosswordle_scores_play_date ON krosswordle_scores(play_date);
CREATE INDEX idx_krosswordle_scores_level_id ON krosswordle_scores(level_id);
CREATE INDEX idx_krosswordle_scores_completion_time ON krosswordle_scores(completion_time);

-- RLS policies
ALTER TABLE krosswordle_scores ENABLE ROW LEVEL SECURITY;

-- Hər kəs oxuya bilər
CREATE POLICY "Hər kəs score-ları görə bilər"
  ON krosswordle_scores
  FOR SELECT
  USING (true);

-- Yalnız öz score-unu əlavə edə bilər
CREATE POLICY "İstifadəçilər öz score-larını əlavə edə bilər"
  ON krosswordle_scores
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Yalnız öz score-unu yeniləyə bilər
CREATE POLICY "İstifadəçilər öz score-larını yeniləyə bilər"
  ON krosswordle_scores
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Leaderboard funksiyası - günlük ən yaxşı nəticələr
CREATE OR REPLACE FUNCTION get_daily_leaderboard(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  completion_time INTEGER,
  level_id INTEGER,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ks.user_id,
    u.username,
    u.full_name,
    u.avatar_url,
    ks.completion_time,
    ks.level_id,
    ROW_NUMBER() OVER (ORDER BY ks.completion_time ASC) as rank
  FROM krosswordle_scores ks
  JOIN users u ON ks.user_id = u.id
  WHERE ks.play_date = target_date
  ORDER BY ks.completion_time ASC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bütün zamanların ən yaxşı nəticələri
CREATE OR REPLACE FUNCTION get_all_time_leaderboard()
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  full_name TEXT,
  avatar_url TEXT,
  total_games INTEGER,
  avg_time NUMERIC,
  best_time INTEGER,
  rank BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ks.user_id,
    u.username,
    u.full_name,
    u.avatar_url,
    COUNT(*)::INTEGER as total_games,
    ROUND(AVG(ks.completion_time)::NUMERIC, 2) as avg_time,
    MIN(ks.completion_time) as best_time,
    ROW_NUMBER() OVER (ORDER BY AVG(ks.completion_time) ASC) as rank
  FROM krosswordle_scores ks
  JOIN users u ON ks.user_id = u.id
  GROUP BY ks.user_id, u.username, u.full_name, u.avatar_url
  ORDER BY avg_time ASC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- İstifadəçinin bugünkü oyununu yoxla
CREATE OR REPLACE FUNCTION check_user_played_today(p_user_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM krosswordle_scores 
    WHERE user_id = p_user_id 
    AND play_date = p_date
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
