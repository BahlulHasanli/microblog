-- play_date sütunu əlavə et (hər level bir günə bağlıdır)
ALTER TABLE krosswordle_levels ADD COLUMN IF NOT EXISTS play_date DATE UNIQUE;

-- Mövcud level-lərə tarix təyin et (əgər varsa)
-- Bu migration çalışdıqdan sonra hər yeni level play_date ilə yaradılmalıdır

-- İndeks
CREATE INDEX IF NOT EXISTS idx_krosswordle_levels_play_date ON krosswordle_levels(play_date);
