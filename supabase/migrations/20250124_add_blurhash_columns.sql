-- Posts cədvəlinə image_blurhash sütunu əlavə et
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_blurhash TEXT;

-- Shares cədvəlinə image_blurhashes sütunu əlavə et (array olaraq saxlanacaq)
ALTER TABLE shares ADD COLUMN IF NOT EXISTS image_blurhashes TEXT[];
