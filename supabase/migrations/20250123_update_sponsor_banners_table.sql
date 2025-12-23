-- Sponsor Bannerləri Cədvəlini Yeniləmə
-- position sütununu click_count ilə əvəz et

ALTER TABLE sponsor_banners DROP COLUMN IF EXISTS position;
ALTER TABLE sponsor_banners ADD COLUMN click_count INT DEFAULT 0;

-- updated_at sütununu yeniləmə üçün trigger yaradın
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_sponsor_banners_updated_at ON sponsor_banners;

CREATE TRIGGER update_sponsor_banners_updated_at BEFORE UPDATE ON sponsor_banners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
