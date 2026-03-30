-- Video şərhlərində qonaq yazıları (post şərhləri ilə eyni məntiq)
ALTER TABLE public.stream_video_comments
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.stream_video_comments
  ADD COLUMN IF NOT EXISTS user_email TEXT,
  ADD COLUMN IF NOT EXISTS user_name TEXT,
  ADD COLUMN IF NOT EXISTS user_fullname TEXT;

ALTER TABLE public.stream_video_comments DROP CONSTRAINT IF EXISTS stream_video_comments_author_chk;

ALTER TABLE public.stream_video_comments
  ADD CONSTRAINT stream_video_comments_author_chk CHECK (
    user_id IS NOT NULL
    OR (
      coalesce(trim(user_email), '') <> ''
      AND coalesce(trim(user_name), '') <> ''
    )
  );

COMMENT ON COLUMN public.stream_video_comments.user_email IS 'Qonaq şərh — email (yalnız server/API)';
COMMENT ON COLUMN public.stream_video_comments.user_name IS 'Qonaq şərh — imza üçün ad';
COMMENT ON COLUMN public.stream_video_comments.user_fullname IS 'Qonaq şərh — göstərilən ad';
