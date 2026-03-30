-- Baxış deduplikasiyası: yalnız IP kifayət etmir (CF header çatmayanda hamı "unknown" olur).
-- dedupe_key: "ip:1.2.3.4" və ya "anon:<brauzer UUID>"

ALTER TABLE public.stream_video_site_views
ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

UPDATE public.stream_video_site_views
SET
  dedupe_key = 'ip:' || ip_address
WHERE
  dedupe_key IS NULL;

ALTER TABLE public.stream_video_site_views
ALTER COLUMN dedupe_key SET NOT NULL;

ALTER TABLE public.stream_video_site_views DROP CONSTRAINT stream_video_site_views_pkey;

ALTER TABLE public.stream_video_site_views
ADD PRIMARY KEY (stream_video_id, dedupe_key);

ALTER TABLE public.stream_video_site_views DROP COLUMN IF EXISTS ip_address;

COMMENT ON TABLE public.stream_video_site_views IS 'Unikal sayt baxışı: (video, dedupe_key) — ip:... və ya anon:uuid';

DROP FUNCTION IF EXISTS public.record_stream_video_site_view_by_ip (UUID, TEXT);

CREATE OR REPLACE FUNCTION public.record_stream_video_site_view (p_id UUID, p_dedupe_key TEXT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v BIGINT;
  norm_key TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT
      1
    FROM
      public.stream_video
    WHERE
      id = p_id
      AND published = true
  ) THEN
    RETURN NULL;
  END IF;

  norm_key := LEFT(COALESCE(NULLIF(TRIM(p_dedupe_key), ''), 'anon:unknown'), 200);

  WITH ins AS (
    INSERT INTO public.stream_video_site_views (stream_video_id, dedupe_key)
    VALUES (p_id, norm_key)
    ON CONFLICT (stream_video_id, dedupe_key) DO NOTHING
    RETURNING
      1
  )
  UPDATE public.stream_video s
  SET
    site_view_count = s.site_view_count + (SELECT COUNT(*)::bigint FROM ins),
    updated_at = NOW()
  WHERE
    s.id = p_id
    AND s.published = true
  RETURNING
    s.site_view_count INTO v;

  IF v IS NULL THEN
    SELECT
      site_view_count INTO v
    FROM
      public.stream_video
    WHERE
      id = p_id;
  END IF;

  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.record_stream_video_site_view (UUID, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.record_stream_video_site_view (UUID, TEXT) TO service_role;
