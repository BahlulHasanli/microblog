-- Bunny CDN: fərdi thumbnail fayl adı (API `thumbnailFileName` — məs. thumbnail.jpg)
ALTER TABLE public.stream_video
ADD COLUMN IF NOT EXISTS bunny_thumbnail_file TEXT;

COMMENT ON COLUMN public.stream_video.bunny_thumbnail_file IS 'Bunny pull zone-da {guid}/{fayl_adı} — paneldə seçilmiş thumbnail';
