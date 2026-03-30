-- Saytda oyunçu ilə izlənmə sayı (Bunny panel statistikasından ayrı)
ALTER TABLE public.stream_video
ADD COLUMN IF NOT EXISTS site_view_count BIGINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.stream_video.site_view_count IS 'Saytda playback ilə artırılan baxış (Bunny API views-dan müstəqil)';

CREATE OR REPLACE FUNCTION public.increment_stream_video_site_views (p_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v BIGINT;
BEGIN
  UPDATE public.stream_video
  SET
    site_view_count = site_view_count + 1,
    updated_at = NOW()
  WHERE
    id = p_id
    AND published = true
  RETURNING
    site_view_count INTO v;

  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_stream_video_site_views (UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.increment_stream_video_site_views (UUID) TO service_role;
