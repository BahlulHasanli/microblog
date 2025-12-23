-- Sponsor Bannerləri Cədvəli
CREATE TABLE IF NOT EXISTS sponsor_banners (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500) NOT NULL,
  banner_url VARCHAR(500) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  click_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RLS (Row Level Security) Siyasətləri
ALTER TABLE sponsor_banners ENABLE ROW LEVEL SECURITY;

-- Admin-lar bütün bannerləri görə bilərlər
CREATE POLICY "Admins can view all sponsor banners" ON sponsor_banners
  FOR SELECT
  USING (auth.jwt() ->> 'role' = 'authenticated');

-- Admin-lar bannerləri dəyişə bilərlər
CREATE POLICY "Admins can update sponsor banners" ON sponsor_banners
  FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'authenticated');

-- Admin-lar bannerləri silə bilərlər
CREATE POLICY "Admins can delete sponsor banners" ON sponsor_banners
  FOR DELETE
  USING (auth.jwt() ->> 'role' = 'authenticated');

-- Admin-lar bannerləri əlavə edə bilərlər
CREATE POLICY "Admins can insert sponsor banners" ON sponsor_banners
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'authenticated');

-- Hamı aktiv bannerləri görə bilərlər
CREATE POLICY "Anyone can view active sponsor banners" ON sponsor_banners
  FOR SELECT
  USING (is_active = true);
