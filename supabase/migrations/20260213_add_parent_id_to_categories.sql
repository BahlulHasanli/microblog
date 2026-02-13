-- İç-içə kateqoriya sistemi üçün parent_id əlavə et
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;

-- Parent kateqoriya üçün indeks
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- Kateqoriyaların sıralama sütunu (isteğe bağlı, sıralama üçün)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
