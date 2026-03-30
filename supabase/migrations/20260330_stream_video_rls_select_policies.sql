-- stream_video cədvəlləri: anon/authenticated üçün oxuma (ana səhifə, şərhlər API-si üçün).
-- Yazma əməliyyatları əksər hallarda service role ilə API-dən gedir.

DROP POLICY IF EXISTS "stream_video_category_select_all" ON public.stream_video_category;
CREATE POLICY "stream_video_category_select_all" ON public.stream_video_category FOR SELECT TO anon,
authenticated USING (true);

DROP POLICY IF EXISTS "stream_video_select_published" ON public.stream_video;
CREATE POLICY "stream_video_select_published" ON public.stream_video FOR SELECT TO anon,
authenticated USING (published = true);

DROP POLICY IF EXISTS "stream_video_comments_select" ON public.stream_video_comments;
CREATE POLICY "stream_video_comments_select" ON public.stream_video_comments FOR SELECT TO anon,
authenticated USING (true);

DROP POLICY IF EXISTS "stream_video_reactions_select" ON public.stream_video_reactions;
CREATE POLICY "stream_video_reactions_select" ON public.stream_video_reactions FOR SELECT TO anon,
authenticated USING (true);
