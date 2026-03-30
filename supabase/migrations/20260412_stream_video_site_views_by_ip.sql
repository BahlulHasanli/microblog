-- Sayt baxışı: hər IP ünvanı + video üçün bir dəfə (post_views ilə eyni məntiq)
CREATE TABLE IF NOT EXISTS public.stream_video_site_views (
  stream_video_id UUID NOT NULL REFERENCES public.stream_video (id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (stream_video_id, ip_address)
);

CREATE INDEX IF NOT EXISTS idx_stream_video_site_views_video ON public.stream_video_site_views (stream_video_id);

COMMENT ON TABLE public.stream_video_site_views IS 'Unikal sayt baxışı: (video, IP) cütlüyü — site_view_count ilə sinxron';

ALTER TABLE public.stream_video_site_views ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.record_stream_video_site_view_by_ip (p_id UUID, p_ip TEXT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v BIGINT;
  rows_ins INT;
  norm_ip TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.stream_video WHERE id = p_id AND published = true) THEN
    RETURN NULL;
  END IF;

  norm_ip := LEFT(COALESCE(NULLIF(TRIM(p_ip), ''), 'unknown'), 128);

  INSERT INTO public.stream_video_site_views (stream_video_id, ip_address)
  VALUES (p_id, norm_ip)
  ON CONFLICT (stream_video_id, ip_address) DO NOTHING;

  GET DIAGNOSTICS rows_ins = ROW_COUNT;

  IF rows_ins > 0 THEN
    UPDATE public.stream_video
    SET
      site_view_count = site_view_count + 1,
      updated_at = NOW()
    WHERE
      id = p_id
      AND published = true
    RETURNING
      site_view_count INTO v;
  ELSE
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

REVOKE ALL ON FUNCTION public.record_stream_video_site_view_by_ip (UUID, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.record_stream_video_site_view_by_ip (UUID, TEXT) TO service_role;
