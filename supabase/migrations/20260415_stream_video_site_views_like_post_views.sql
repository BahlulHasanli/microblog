-- Stream video sayt baxışı: post_views ilə eyni məntiq (IP + video unikal, anon INSERT/SELECT).
-- Baxış sayı yalnız stream_video_site_views üzərindən hesablanır; stream_video.site_view_count toxunulmur.

DO $droptr$
BEGIN
  IF to_regclass('public.stream_video_site_views') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS tr_bump_stream_video_site_view_count ON public.stream_video_site_views;
  END IF;
END;
$droptr$;

DROP FUNCTION IF EXISTS public.bump_stream_video_site_view_count ();

DROP FUNCTION IF EXISTS public.record_stream_video_site_view (UUID, TEXT);

DROP FUNCTION IF EXISTS public.record_stream_video_site_view_by_ip (UUID, TEXT);

DO $$
DECLARE
  has_dedupe boolean;
BEGIN
  IF to_regclass('public.stream_video_site_views') IS NULL THEN
    NULL;
  ELSE
  SELECT EXISTS (
    SELECT
      1
    FROM
      information_schema.columns
    WHERE
      table_schema = 'public'
      AND table_name = 'stream_video_site_views'
      AND column_name = 'dedupe_key'
  ) INTO has_dedupe;

  IF has_dedupe THEN
    CREATE TABLE public.stream_video_site_views_new (
      stream_video_id UUID NOT NULL REFERENCES public.stream_video (id) ON DELETE CASCADE,
      ip_address VARCHAR(45) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (stream_video_id, ip_address)
    );

    INSERT INTO public.stream_video_site_views_new (stream_video_id, ip_address, created_at)
    SELECT DISTINCT ON (stream_video_id, nip)
      stream_video_id,
      nip,
      created_at
    FROM (
      SELECT
        stream_video_id,
        LEFT(
          CASE
            WHEN dedupe_key LIKE 'ip:%' THEN substring(dedupe_key FROM 4)
            ELSE 'unknown'
          END,
          45
        ) AS nip,
        created_at
      FROM
        public.stream_video_site_views
    ) sub
    ORDER BY
      stream_video_id,
      nip,
      created_at ASC;

    DROP TABLE public.stream_video_site_views;

    ALTER TABLE public.stream_video_site_views_new RENAME TO stream_video_site_views;
  END IF;
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.stream_video_site_views (
  stream_video_id UUID NOT NULL REFERENCES public.stream_video (id) ON DELETE CASCADE,
  ip_address VARCHAR(45) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (stream_video_id, ip_address)
);

CREATE INDEX IF NOT EXISTS idx_stream_video_site_views_video ON public.stream_video_site_views (stream_video_id);

COMMENT ON TABLE public.stream_video_site_views IS 'Unikal sayt baxışı: (video, IP) — post_views ilə eyni; say COUNT(stream_video_site_views)';

ALTER TABLE public.stream_video_site_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert stream video site views" ON public.stream_video_site_views;

CREATE POLICY "Anyone can insert stream video site views" ON public.stream_video_site_views FOR INSERT TO anon,
authenticated
WITH CHECK (
  EXISTS (
    SELECT
      1
    FROM
      public.stream_video sv
    WHERE
      sv.id = stream_video_id
      AND sv.published = true
  )
);

DROP POLICY IF EXISTS "Anyone can read stream video site views" ON public.stream_video_site_views;

CREATE POLICY "Anyone can read stream video site views" ON public.stream_video_site_views FOR SELECT TO anon,
authenticated USING (true);

GRANT SELECT,
INSERT ON public.stream_video_site_views TO anon;

GRANT SELECT,
INSERT ON public.stream_video_site_views TO authenticated;
