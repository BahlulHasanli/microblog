-- Post baxışları üçün cədvəl yaradılır
-- Hər IP ünvanı hər post üçün yalnız bir dəfə sayılır

CREATE TABLE IF NOT EXISTS post_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    ip_address VARCHAR(45) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, ip_address)
);

-- İndeks əlavə et - performans üçün
CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_post_views_ip_address ON post_views(ip_address);

-- RLS (Row Level Security) aktivləşdir
ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;

-- Hər kəs baxış əlavə edə bilər (anonim daxil)
CREATE POLICY "Anyone can insert views" ON post_views
    FOR INSERT
    WITH CHECK (true);

-- Hər kəs baxış sayını oxuya bilər
CREATE POLICY "Anyone can read views" ON post_views
    FOR SELECT
    USING (true);
