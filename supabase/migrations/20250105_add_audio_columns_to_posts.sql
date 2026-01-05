-- Posts cədvəlinə audio sütunları əlavə et
ALTER TABLE posts ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS audio_title TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS audio_artist TEXT;

-- İndeks əlavə et (optional, performans üçün)
CREATE INDEX IF NOT EXISTS idx_posts_audio_url ON posts(audio_url) WHERE audio_url IS NOT NULL;
