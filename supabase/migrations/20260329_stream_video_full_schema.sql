-- Pəncərələr / Stream video: kateqoriya, video, reaksiya, şərhlər + users əlaqələri
-- Köhnə stream_video_comments (video_guid) varsa silinir.

DROP TABLE IF EXISTS public.stream_video_comments CASCADE;
DROP TABLE IF EXISTS public.stream_video_reactions CASCADE;
DROP TABLE IF EXISTS public.stream_video CASCADE;
DROP TABLE IF EXISTS public.stream_video_category CASCADE;

CREATE TABLE public.stream_video_category (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.stream_video (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
  bunny_video_guid TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.stream_video_category (id) ON DELETE SET NULL,
  bunny_status INT,
  duration_seconds INT,
  published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stream_video_user_id ON public.stream_video (user_id);
CREATE INDEX idx_stream_video_category_id ON public.stream_video (category_id);
CREATE INDEX idx_stream_video_created ON public.stream_video (created_at DESC);
CREATE INDEX idx_stream_video_published ON public.stream_video (published) WHERE published = TRUE;

CREATE TABLE public.stream_video_reactions (
  id BIGSERIAL PRIMARY KEY,
  stream_video_id UUID NOT NULL REFERENCES public.stream_video (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT stream_video_reactions_unique_user_type UNIQUE (stream_video_id, user_id, reaction_type)
);

CREATE INDEX idx_stream_video_reactions_video ON public.stream_video_reactions (stream_video_id);

CREATE TABLE public.stream_video_comments (
  id BIGSERIAL PRIMARY KEY,
  stream_video_id UUID NOT NULL REFERENCES public.stream_video (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  parent_id BIGINT REFERENCES public.stream_video_comments (id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (
    char_length(content) > 0
    AND char_length(content) <= 1000
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stream_video_comments_video ON public.stream_video_comments (stream_video_id);
CREATE INDEX idx_stream_video_comments_created ON public.stream_video_comments (stream_video_id, created_at DESC);

ALTER TABLE public.stream_video_category ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_video ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_video_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_video_comments ENABLE ROW LEVEL SECURITY;

-- Default kateqoriya (frames kolleksiyası ilə uyğun ad)
INSERT INTO public.stream_video_category (name, slug, sort_order)
VALUES ('Frames', 'frames', 0)
ON CONFLICT (slug) DO NOTHING;
