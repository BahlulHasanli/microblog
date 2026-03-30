-- ROW_COUNT + INSERT ON CONFLICT bəzi mühitlərdə səhv ola bilər; CTE ilə atomik artır
CREATE OR REPLACE FUNCTION public.record_stream_video_site_view_by_ip (p_id UUID, p_ip TEXT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v BIGINT;
  norm_ip TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.stream_video WHERE id = p_id AND published = true) THEN
    RETURN NULL;
  END IF;

  norm_ip := LEFT(COALESCE(NULLIF(TRIM(p_ip), ''), 'unknown'), 128);

  WITH ins AS (
    INSERT INTO public.stream_video_site_views (stream_video_id, ip_address)
    VALUES (p_id, norm_ip)
    ON CONFLICT (stream_video_id, ip_address) DO NOTHING
    RETURNING 1
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
