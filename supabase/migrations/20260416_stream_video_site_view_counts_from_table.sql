-- Baxış sayı yalnız stream_video_site_views cədvəlindən hesablanır; site_view_count sütununa avto-yazma lazım deyil.

DROP TRIGGER IF EXISTS tr_bump_stream_video_site_view_count ON public.stream_video_site_views;

DROP FUNCTION IF EXISTS public.bump_stream_video_site_view_count ();

CREATE OR REPLACE FUNCTION public.stream_video_site_view_counts (p_ids UUID[])
RETURNS TABLE (
  stream_video_id UUID,
  cnt BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    v.stream_video_id,
    COUNT(*)::bigint AS cnt
  FROM
    public.stream_video_site_views v
  WHERE
    v.stream_video_id = ANY (p_ids)
  GROUP BY
    v.stream_video_id;
$$;

REVOKE ALL ON FUNCTION public.stream_video_site_view_counts (UUID[]) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.stream_video_site_view_counts (UUID[]) TO service_role;

COMMENT ON FUNCTION public.stream_video_site_view_counts (UUID[]) IS 'Videolar üçün sayt baxışı sayı — yalnız stream_video_site_views';
