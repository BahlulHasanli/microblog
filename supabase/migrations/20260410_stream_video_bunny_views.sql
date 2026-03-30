-- Bunny Stream API `views` — sinxron TTL ilə yenilənir
ALTER TABLE public.stream_video
ADD COLUMN IF NOT EXISTS bunny_views BIGINT;

COMMENT ON COLUMN public.stream_video.bunny_views IS 'Bunny Stream video.views (son meta sorğusundan)';
