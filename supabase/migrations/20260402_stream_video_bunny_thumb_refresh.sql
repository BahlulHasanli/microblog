-- Bunny thumbnail yenilənəndə brauzer keşi + DB sinxronu: API thumbnailUpdatedAt və son sorğu vaxtı
ALTER TABLE public.stream_video
ADD COLUMN IF NOT EXISTS bunny_thumbnail_updated_at TEXT;

ALTER TABLE public.stream_video
ADD COLUMN IF NOT EXISTS bunny_stream_meta_fetched_at TIMESTAMPTZ;

COMMENT ON COLUMN public.stream_video.bunny_thumbnail_updated_at IS 'Bunny API thumbnailUpdatedAt və ya son sinxron — img ?v= cache bust';
COMMENT ON COLUMN public.stream_video.bunny_stream_meta_fetched_at IS 'Son uğurlu Bunny video meta sorğusu (TTL)';
