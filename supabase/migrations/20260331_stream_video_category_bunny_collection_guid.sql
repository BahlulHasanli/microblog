-- Kateqoriya ↔ Bunny Stream kolleksiyası: GUID keş (hər yükləmədə axtarışı azaldır)
ALTER TABLE public.stream_video_category
ADD COLUMN IF NOT EXISTS bunny_collection_guid TEXT;

COMMENT ON COLUMN public.stream_video_category.bunny_collection_guid IS 'Bunny Stream kolleksiya GUID — bir dəfə həll/yaradılır və yazılır';
