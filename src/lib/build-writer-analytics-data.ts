import { supabaseAdmin } from "@/db/supabase";
import { formatSimpleDate } from "@/utils/date";
import {
  estimateWordCountFromHtml,
  estimateReadMinutes,
  utcDayKey,
  rollingUtcDayLabels,
  previousPeriodLabels,
  sumForDayKeys,
  pctChange,
} from "@/utils/writer-analytics";
import type { WriterAnalyticsData } from "@/components/writer/WriterAnalyticsTabs";

type BuildParams = { authorId: string | number } | { site: true };

type PostRow = {
  id: number;
  slug: string;
  title: string;
  approved: boolean;
  pub_date: string | null;
  content?: string;
  categories?: string[];
  author_id?: string | number | null;
};

export type AdminAnalyticsTotals = {
  totalPosts: number;
  totalViews: number;
  totalComments: number;
  authorWithPostsCount: number;
};

export type AdminAnalyticsAuthorRow = {
  authorId: string;
  label: string;
  postCount: number;
  viewCount: number;
  commentCount: number;
};

export type AdminAnalyticsOverview = {
  totals: AdminAnalyticsTotals;
  authors: AdminAnalyticsAuthorRow[];
};

export async function buildWriterAnalyticsData(
  params: BuildParams,
): Promise<WriterAnalyticsData> {
  const isSite = "site" in params && params.site;

  let q = supabaseAdmin
    .from("posts")
    .select(
      "id, slug, title, approved, pub_date, content, categories, author_id",
    )
    .order("pub_date", { ascending: false });

  if (!isSite) {
    q = q.eq("author_id", (params as { authorId: string | number }).authorId);
  }

  const { data: postsRaw, error: postsError } = await q;

  if (postsError) {
    console.error("buildWriterAnalyticsData — posts:", postsError);
  }

  const posts = (postsRaw ?? []) as PostRow[];
  const postIds = posts.map((p) => p.id);
  const slugs = posts.map((p) => p.slug);

  const authorLabels: Record<string, string> = {};
  if (isSite) {
    const ids = [
      ...new Set(
        posts
          .map((p) => p.author_id)
          .filter((x): x is string | number => x != null),
      ),
    ];
    if (ids.length > 0) {
      const { data: userRows } = await supabaseAdmin
        .from("users")
        .select("id, fullname, username")
        .in("id", ids);
      for (const u of userRows ?? []) {
        const id = String(u.id);
        const fn = (u.fullname as string | null)?.trim();
        const un = (u.username as string | null)?.trim();
        authorLabels[id] = fn || un || `#${id}`;
      }
    }
  }

  const contributionsByDate: Record<string, number> = {};
  for (const p of posts) {
    if (!p.pub_date) continue;
    const k = utcDayKey(new Date(p.pub_date as string));
    contributionsByDate[k] = (contributionsByDate[k] ?? 0) + 1;
  }

  const viewCounts: Record<number, number> = {};
  for (const id of postIds) viewCounts[id] = 0;

  if (postIds.length > 0) {
    const { data: viewRows, error: viewsError } = await supabaseAdmin
      .from("post_views")
      .select("post_id")
      .in("post_id", postIds);

    if (viewsError) {
      console.error("buildWriterAnalyticsData — views:", viewsError);
    } else if (viewRows) {
      for (const row of viewRows) {
        const pid = row.post_id as number;
        viewCounts[pid] = (viewCounts[pid] ?? 0) + 1;
      }
    }
  }

  const commentCounts: Record<string, number> = {};
  for (const s of slugs) commentCounts[s] = 0;

  if (slugs.length > 0) {
    const { data: commentRows, error: commentsError } = await supabaseAdmin
      .from("comments")
      .select("post_slug")
      .in("post_slug", slugs);

    if (commentsError) {
      console.error("buildWriterAnalyticsData — comments:", commentsError);
    } else if (commentRows) {
      for (const row of commentRows) {
        const slug = row.post_slug as string;
        commentCounts[slug] = (commentCounts[slug] ?? 0) + 1;
      }
    }
  }

  const trendCutoff = new Date(
    Date.now() - 60 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const viewCountsByDay: Record<string, number> = {};
  const commentCountsByDay: Record<string, number> = {};

  if (postIds.length > 0) {
    const { data: timedViews, error: tvErr } = await supabaseAdmin
      .from("post_views")
      .select("created_at")
      .in("post_id", postIds)
      .gte("created_at", trendCutoff);

    if (tvErr) console.error("buildWriterAnalyticsData — view trend:", tvErr);
    else if (timedViews) {
      for (const row of timedViews) {
        const key = utcDayKey(new Date(row.created_at as string));
        viewCountsByDay[key] = (viewCountsByDay[key] ?? 0) + 1;
      }
    }
  }

  if (slugs.length > 0) {
    const { data: timedComments, error: tcErr } = await supabaseAdmin
      .from("comments")
      .select("created_at")
      .in("post_slug", slugs)
      .gte("created_at", trendCutoff);

    if (tcErr)
      console.error("buildWriterAnalyticsData — comment trend:", tcErr);
    else if (timedComments) {
      for (const row of timedComments) {
        const key = utcDayKey(new Date(row.created_at as string));
        commentCountsByDay[key] = (commentCountsByDay[key] ?? 0) + 1;
      }
    }
  }

  const labels7 = rollingUtcDayLabels(7);
  const prev7 = previousPeriodLabels(labels7);
  const labels30 = rollingUtcDayLabels(30);
  const prev30 = previousPeriodLabels(labels30);

  const v7 = sumForDayKeys(viewCountsByDay, labels7);
  const v7prev = sumForDayKeys(viewCountsByDay, prev7);
  const c7 = sumForDayKeys(commentCountsByDay, labels7);
  const c7prev = sumForDayKeys(commentCountsByDay, prev7);

  const v30 = sumForDayKeys(viewCountsByDay, labels30);
  const v30prev = sumForDayKeys(viewCountsByDay, prev30);
  const c30 = sumForDayKeys(commentCountsByDay, labels30);
  const c30prev = sumForDayKeys(commentCountsByDay, prev30);

  const dV7 = pctChange(v7, v7prev);
  const dC7 = pctChange(c7, c7prev);
  const dV30 = pctChange(v30, v30prev);
  const dC30 = pctChange(c30, c30prev);

  type ArticleRow = {
    id: number;
    slug: string;
    title: string;
    approved: boolean;
    pub_date: string | null;
    viewCount: number;
    commentCount: number;
    author_id?: string | number | null;
  };

  const articles: ArticleRow[] = posts.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    approved: p.approved,
    pub_date: p.pub_date,
    viewCount: viewCounts[p.id] ?? 0,
    commentCount: commentCounts[p.slug] ?? 0,
    author_id: p.author_id,
  }));

  articles.sort((a, b) => b.viewCount - a.viewCount);

  const totalPosts = articles.length;
  const totalViews = articles.reduce((s, a) => s + a.viewCount, 0);
  const totalComments = articles.reduce((s, a) => s + a.commentCount, 0);

  const topByViews =
    articles.length > 0
      ? articles.reduce(
          (best, a) => (a.viewCount > best.viewCount ? a : best),
          articles[0],
        )
      : null;

  let totalWords = 0;
  let totalReadMinutes = 0;
  for (const p of posts) {
    const html = p.content ?? "";
    const w = estimateWordCountFromHtml(html);
    totalWords += w;
    totalReadMinutes += estimateReadMinutes(w);
  }
  const avgWords =
    posts.length > 0 ? Math.round(totalWords / posts.length) : 0;
  const avgReadMin =
    posts.length > 0
      ? Math.round((totalReadMinutes / posts.length) * 10) / 10
      : 0;
  const viewsPer1kWords =
    totalWords > 0
      ? Math.round((totalViews / (totalWords / 1000)) * 10) / 10
      : 0;

  const catWeightedViews: Record<string, number> = {};
  const catWeightedComments: Record<string, number> = {};

  for (const p of posts) {
    const rawCats = p.categories;
    const cats = Array.isArray(rawCats)
      ? rawCats.map((c) => String(c).trim()).filter(Boolean)
      : [];
    const n = Math.max(cats.length, 1);
    const v = viewCounts[p.id] ?? 0;
    const c = commentCounts[p.slug] ?? 0;
    if (cats.length === 0) {
      catWeightedViews["_"] = (catWeightedViews["_"] ?? 0) + v;
      catWeightedComments["_"] = (catWeightedComments["_"] ?? 0) + c;
    } else {
      for (const cat of cats) {
        catWeightedViews[cat] = (catWeightedViews[cat] ?? 0) + v / n;
        catWeightedComments[cat] = (catWeightedComments[cat] ?? 0) + c / n;
      }
    }
  }

  const catSlugs = Object.keys(catWeightedViews);
  const categoryNames: Record<string, string> = {};
  const categorySlugsToResolve = catSlugs.filter((s) => s !== "_");
  if (categorySlugsToResolve.length > 0) {
    const { data: catRows } = await supabaseAdmin
      .from("categories")
      .select("slug, name")
      .in("slug", categorySlugsToResolve);

    if (catRows) {
      for (const row of catRows) {
        categoryNames[row.slug as string] = row.name as string;
      }
    }
  }

  type CatRow = { slug: string; name: string; views: number; comments: number };
  const categoryRows: CatRow[] = catSlugs
    .map((slug) => ({
      slug,
      name:
        slug === "_"
          ? "Bölməsiz"
          : categoryNames[slug] || slug,
      views: catWeightedViews[slug] ?? 0,
      comments: catWeightedComments[slug] ?? 0,
    }))
    .sort((a, b) => b.views - a.views);

  const maxCatViews =
    categoryRows.length > 0
      ? Math.max(...categoryRows.map((r) => r.views), 0.0001)
      : 1;

  const scope = isSite ? "site" : "author";

  const articlesPayload = articles.map((a) => {
    const base = {
      slug: a.slug,
      title: a.title,
      pubDateLabel: a.pub_date ? formatSimpleDate(a.pub_date) : "—",
      viewCount: a.viewCount,
      commentCount: a.commentCount,
      approved: a.approved,
    };
    if (
      isSite &&
      a.author_id != null &&
      authorLabels[String(a.author_id)] !== undefined
    ) {
      return { ...base, authorLabel: authorLabels[String(a.author_id)] };
    }
    return base;
  });

  return {
    scope,
    totalPosts,
    totalViews,
    totalComments,
    contributionsByDate,
    avgWords,
    avgReadMin,
    viewsPer1kWords,
    trend: {
      v7,
      v7prev,
      c7,
      c7prev,
      v30,
      v30prev,
      c30,
      c30prev,
      dV7,
      dC7,
      dV30,
      dC30,
    },
    categoryRows: categoryRows.map((r) => ({
      slug: r.slug,
      name: r.name,
      views: r.views,
      comments: r.comments,
    })),
    maxCatViews,
    topByViews: topByViews
      ? {
          slug: topByViews.slug,
          title: topByViews.title,
          viewCount: topByViews.viewCount,
          commentCount: topByViews.commentCount,
        }
      : null,
    articles: articlesPayload,
  };
}

/** Admin panel: yalnız ümumi rəqəmlər və müəllif üzrə aqreqasiya (tam detal üçün `buildWriterAnalyticsData({ authorId })`). */
export async function buildAdminAnalyticsOverview(): Promise<AdminAnalyticsOverview> {
  const { data: postsRaw, error: postsError } = await supabaseAdmin
    .from("posts")
    .select("id, slug, author_id")
    .order("pub_date", { ascending: false });

  if (postsError) {
    console.error("buildAdminAnalyticsOverview — posts:", postsError);
  }

  const posts = (postsRaw ?? []) as {
    id: number;
    slug: string;
    author_id?: string | number | null;
  }[];

  const postIds = posts.map((p) => p.id);
  const slugs = posts.map((p) => p.slug);

  const viewCounts: Record<number, number> = {};
  for (const id of postIds) viewCounts[id] = 0;

  if (postIds.length > 0) {
    const { data: viewRows, error: viewsError } = await supabaseAdmin
      .from("post_views")
      .select("post_id")
      .in("post_id", postIds);

    if (viewsError) {
      console.error("buildAdminAnalyticsOverview — views:", viewsError);
    } else if (viewRows) {
      for (const row of viewRows) {
        const pid = row.post_id as number;
        viewCounts[pid] = (viewCounts[pid] ?? 0) + 1;
      }
    }
  }

  const commentCounts: Record<string, number> = {};
  for (const s of slugs) commentCounts[s] = 0;

  if (slugs.length > 0) {
    const { data: commentRows, error: commentsError } = await supabaseAdmin
      .from("comments")
      .select("post_slug")
      .in("post_slug", slugs);

    if (commentsError) {
      console.error("buildAdminAnalyticsOverview — comments:", commentsError);
    } else if (commentRows) {
      for (const row of commentRows) {
        const slug = row.post_slug as string;
        commentCounts[slug] = (commentCounts[slug] ?? 0) + 1;
      }
    }
  }

  type Agg = { postCount: number; viewCount: number; commentCount: number };
  const byAuthor = new Map<string, Agg>();

  for (const p of posts) {
    if (p.author_id == null) continue;
    const key = String(p.author_id);
    const cur = byAuthor.get(key) ?? {
      postCount: 0,
      viewCount: 0,
      commentCount: 0,
    };
    cur.postCount += 1;
    cur.viewCount += viewCounts[p.id] ?? 0;
    cur.commentCount += commentCounts[p.slug] ?? 0;
    byAuthor.set(key, cur);
  }

  const authorIds = [...byAuthor.keys()];
  const labels: Record<string, string> = {};
  if (authorIds.length > 0) {
    const { data: userRows } = await supabaseAdmin
      .from("users")
      .select("id, fullname, username")
      .in("id", authorIds);

    for (const u of userRows ?? []) {
      const id = String(u.id);
      const fn = (u.fullname as string | null)?.trim();
      const un = (u.username as string | null)?.trim();
      labels[id] = fn || un || `#${id}`;
    }
  }

  const authors: AdminAnalyticsAuthorRow[] = authorIds.map((authorId) => {
    const a = byAuthor.get(authorId)!;
    return {
      authorId,
      label: labels[authorId] ?? `#${authorId}`,
      postCount: a.postCount,
      viewCount: a.viewCount,
      commentCount: a.commentCount,
    };
  });

  authors.sort((x, y) => y.viewCount - x.viewCount);

  const totalPosts = posts.length;
  const totalViews = posts.reduce((s, p) => s + (viewCounts[p.id] ?? 0), 0);
  const totalComments = posts.reduce(
    (s, p) => s + (commentCounts[p.slug] ?? 0),
    0,
  );

  return {
    totals: {
      totalPosts,
      totalViews,
      totalComments,
      authorWithPostsCount: byAuthor.size,
    },
    authors,
  };
}
