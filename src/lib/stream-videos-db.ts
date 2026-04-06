import { supabaseAdmin } from "@/db/supabase";
import {
  buildBunnyStreamThumbnailUrl,
  fetchBunnyVideoDetails,
  fetchWindowsVideos,
  type WindowsVideo,
} from "@/lib/bunny-stream-videos";

const DEFAULT_BUNNY_LIBRARY_ID = 486986;

function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

type StreamVideoRow = {
  id: string;
  bunny_video_guid: string;
  title: string;
  description?: string | null;
  duration_seconds: number | null;
  /** Bunny API `thumbnailFileName` — fərdi thumbnail */
  bunny_thumbnail_file?: string | null;
  /** Bunny `thumbnailUpdatedAt` və ya son sinxron — `?v=` üçün */
  bunny_thumbnail_updated_at?: string | null;
  bunny_stream_meta_fetched_at?: string | null;
  users?: { fullname?: string | null; username?: string | null; avatar?: string | null } | null;
  stream_video_category?: { id?: string; name?: string; slug?: string } | null;
  /** Bunny API `views` */
  bunny_views?: number | string | null;
};

function mapRow(row: StreamVideoRow, cdnHostname: string, siteViewCountFromTable: number): WindowsVideo {
  const host = cdnHostname.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const base = `https://${host}/${row.bunny_video_guid}`;
  const sec = row.duration_seconds ?? 0;
  const cacheBust = row.bunny_thumbnail_updated_at?.trim() || row.bunny_stream_meta_fetched_at?.trim() || null;

  const desc = row.description?.trim();
  return {
    streamVideoId: row.id,
    guid: row.bunny_video_guid,
    videoUrl: `${base}/playlist.m3u8`,
    title: row.title?.trim() || "Video",
    description: desc && desc.length > 0 ? desc : null,
    authorName: row.users?.fullname || row.users?.username || "The 99",
    authorAvatar: row.users?.avatar || "",
    thumbnail: buildBunnyStreamThumbnailUrl(
      cdnHostname,
      row.bunny_video_guid,
      row.bunny_thumbnail_file,
      cacheBust
    ),
    previewUrl: `https://${host}/${row.bunny_video_guid}/preview.webp`,
    duration: formatDuration(sec),
    category: row.stream_video_category?.name?.trim() || "Pəncərələr",
    viewCount: parseBunnyViews(row.bunny_views),
    siteViewCount: siteViewCountFromTable,
  };
}

function parseBunnyViews(raw: number | string | null | undefined): number | null {
  if (raw == null) return null;
  const n = typeof raw === "string" ? Number(raw) : raw;
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

async function fetchSiteViewCountsByVideoIds(videoIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const ids = videoIds.filter(Boolean);
  if (ids.length === 0) return map;

  const { data, error } = await supabaseAdmin.rpc("stream_video_site_view_counts", {
    p_ids: ids,
  });

  if (error) {
    console.warn("[stream-videos-db] stream_video_site_view_counts", error.message);
    return map;
  }

  for (const row of (data || []) as { stream_video_id: string; cnt: number | string }[]) {
    const id = row.stream_video_id;
    if (!id) continue;
    const raw = row.cnt;
    const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : 0;
    map.set(id, Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0);
  }
  return map;
}

function readEnv(name: string, runtimeEnv?: Record<string, string | undefined>): string | undefined {
  const fromRuntime = runtimeEnv?.[name];
  if (fromRuntime !== undefined && fromRuntime !== "") return fromRuntime;
  return (import.meta.env as Record<string, string | undefined>)[name];
}

export type FetchHomeStreamVideosOptions = {
  limit?: number;
  runtimeEnv?: Record<string, string | undefined>;
  /**
   * true: yalnız `stream_video` (Bunny fallback və DB+ Bunny tamamlama yox).
   * Ana səhifə “Pəncərələr” önizləməsi üçün — DB boşdursa boş massiv.
   */
  dbOnly?: boolean;
};

const STREAM_SELECT_FULL = `
      id,
      bunny_video_guid,
      title,
      description,
      duration_seconds,
      bunny_thumbnail_file,
      bunny_thumbnail_updated_at,
      bunny_stream_meta_fetched_at,
      bunny_views,
      users:user_id (fullname, username, avatar),
      stream_video_category (id, name, slug)
    `;

const STREAM_SELECT_NO_USER = `
      id,
      bunny_video_guid,
      title,
      description,
      duration_seconds,
      bunny_thumbnail_file,
      bunny_thumbnail_updated_at,
      bunny_stream_meta_fetched_at,
      bunny_views,
      stream_video_category (id, name, slug)
    `;

/** Migrasiya (`bunny_thumbnail_updated_at` / `bunny_stream_meta_fetched_at`) olmayan DB üçün — sorğu uğursuz olmasın */
const STREAM_SELECT_FULL_LEGACY = `
      id,
      bunny_video_guid,
      title,
      description,
      duration_seconds,
      bunny_thumbnail_file,
      users:user_id (fullname, username, avatar),
      stream_video_category (id, name, slug)
    `;

const STREAM_SELECT_NO_USER_LEGACY = `
      id,
      bunny_video_guid,
      title,
      description,
      duration_seconds,
      bunny_thumbnail_file,
      stream_video_category (id, name, slug)
    `;

function streamMetaColumnsMissingFromDbError(message: string | undefined): boolean {
  const m = (message || "").toLowerCase();
  return (
    m.includes("bunny_thumbnail_updated_at") ||
    m.includes("bunny_stream_meta_fetched_at") ||
    (m.includes("column") && m.includes("does not exist"))
  );
}

/** TTL bitəndə Bunny-dən yenidən oxunur — paneldə thumbnail dəyişəndə sayt yenilənir. 0 = hər dəfə. */
function bunnyMetaTtlMs(runtimeEnv?: Record<string, string | undefined>): number {
  const raw = readEnv("BUNNY_STREAM_META_TTL_MS", runtimeEnv);
  if (raw === "0" || raw === "always") return 0;
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 0) return n;
  return 60_000;
}

function shouldRefetchBunnyMeta(row: StreamVideoRow, ttlMs: number): boolean {
  if (ttlMs <= 0) return true;
  if (row.duration_seconds == null || row.duration_seconds <= 0) return true;
  if (!row.bunny_thumbnail_file?.trim()) return true;
  const fetched = row.bunny_stream_meta_fetched_at;
  if (!fetched) return true;
  const t = new Date(fetched).getTime();
  if (Number.isNaN(t)) return true;
  return Date.now() - t > ttlMs;
}

/**
 * TTL ilə Bunny `GET .../videos/{guid}` — müddət, thumbnail faylı, thumbnailUpdatedAt; DB + `?v=` keş sındırma.
 */
async function enrichStreamRowsFromBunny(
  rows: StreamVideoRow[],
  runtimeEnv?: Record<string, string | undefined>
): Promise<StreamVideoRow[]> {
  const apiKey = readEnv("BUNNY_STREAM_API_KEY", runtimeEnv);
  if (!apiKey || rows.length === 0) {
    return rows;
  }

  const libraryId = Number(
    readEnv("BUNNY_STREAM_LIBRARY_ID", runtimeEnv) || DEFAULT_BUNNY_LIBRARY_ID
  );

  const ttlMs = bunnyMetaTtlMs(runtimeEnv);
  const need = rows.filter((r) => shouldRefetchBunnyMeta(r, ttlMs));
  if (need.length === 0) {
    return rows;
  }

  const results = await Promise.all(
    need.map((r) =>
      fetchBunnyVideoDetails({
        apiKey,
        libraryId,
        guid: r.bunny_video_guid,
      }).then((details) => ({ row: r, details }))
    )
  );

  const patchByGuid = new Map<string, Partial<StreamVideoRow>>();

  for (const { row, details } of results) {
    if (!details.ok) continue;

    const fetchedAt = new Date().toISOString();
    const bust =
      details.thumbnailUpdatedAt?.trim() ||
      fetchedAt;

    const patch: Partial<StreamVideoRow> = {
      bunny_stream_meta_fetched_at: fetchedAt,
      bunny_thumbnail_updated_at: bust,
    };

    if (details.lengthSeconds != null && details.lengthSeconds > 0) {
      patch.duration_seconds = details.lengthSeconds;
    }
    if (details.thumbnailFileName) {
      patch.bunny_thumbnail_file = details.thumbnailFileName;
    }
    if (details.views != null) {
      patch.bunny_views = details.views;
    }

    patchByGuid.set(row.bunny_video_guid, {
      ...(patchByGuid.get(row.bunny_video_guid) ?? {}),
      ...patch,
    });

    if (row.id) {
      const dbPatch: {
        duration_seconds?: number;
        bunny_thumbnail_file?: string;
        bunny_thumbnail_updated_at?: string;
        bunny_stream_meta_fetched_at?: string;
        bunny_views?: number;
      } = {
        bunny_stream_meta_fetched_at: fetchedAt,
        bunny_thumbnail_updated_at: bust,
      };
      if (patch.duration_seconds != null) dbPatch.duration_seconds = patch.duration_seconds;
      if (patch.bunny_thumbnail_file != null) dbPatch.bunny_thumbnail_file = patch.bunny_thumbnail_file;
      if (patch.bunny_views != null) dbPatch.bunny_views = patch.bunny_views;

      void supabaseAdmin
        .from("stream_video")
        .update(dbPatch)
        .eq("id", row.id)
        .then(({ error }) => {
          if (error) {
            console.warn("[stream-videos-db] Bunny meta yenilənmədi", row.id, error.message);
          }
        });
    }
  }

  if (patchByGuid.size === 0) {
    return rows;
  }

  return rows.map((r) => {
    const p = patchByGuid.get(r.bunny_video_guid);
    return p ? { ...r, ...p } : r;
  });
}

/**
 * Varsayılan: DB yayımlanmış videolar + eyni guid-lər çıxarılmış Bunny ilə tamamlama; boş/xəta → Bunny.
 * `dbOnly: true`: yalnız DB, boş və ya xəta → `[]`.
 */
export async function fetchHomeStreamVideos(
  options?: FetchHomeStreamVideosOptions
): Promise<WindowsVideo[]> {
  const dbOnly = options?.dbOnly === true;

  const cdn =
    readEnv("BUNNY_STREAM_CDN_HOSTNAME", options?.runtimeEnv) ||
    "vz-300fcde7-b36.b-cdn.net";

  const limit = options?.limit;

  let selectFull = STREAM_SELECT_FULL;
  let selectNoUser = STREAM_SELECT_NO_USER;

  function buildStreamQuery(select: string) {
    let qq = supabaseAdmin
      .from("stream_video")
      .select(select)
      .eq("published", true)
      .order("created_at", { ascending: false });
    if (typeof limit === "number" && limit > 0) {
      qq = qq.limit(limit);
    }
    return qq;
  }

  let { data, error } = await buildStreamQuery(selectFull);

  if (error && streamMetaColumnsMissingFromDbError(error.message)) {
    selectFull = STREAM_SELECT_FULL_LEGACY;
    selectNoUser = STREAM_SELECT_NO_USER_LEGACY;
    const legacy = await buildStreamQuery(selectFull);
    data = legacy.data;
    error = legacy.error;
  }

  if (error) {
    const msg = (error.message || "").toLowerCase();
    const tryNoUser =
      msg.includes("permission") ||
      msg.includes("policy") ||
      msg.includes("embed") ||
      msg.includes("schema cache") ||
      msg.includes("could not find");

    if (tryNoUser) {
      const r2 = await buildStreamQuery(selectNoUser);
      data = r2.data;
      error = r2.error;
      if (error && streamMetaColumnsMissingFromDbError(error.message)) {
        const r3 = await buildStreamQuery(STREAM_SELECT_NO_USER_LEGACY);
        data = r3.data;
        error = r3.error;
      }
    }
  }

  if (error) {
    console.warn("[stream-videos-db]", error.message);
    return dbOnly ? [] : fetchWindowsVideos(options);
  }

  let rows = (data || []) as StreamVideoRow[];
  if (rows.length === 0) {
    return dbOnly ? [] : fetchWindowsVideos(options);
  }

  rows = await enrichStreamRowsFromBunny(rows, options?.runtimeEnv);

  const siteViewById = await fetchSiteViewCountsByVideoIds(rows.map((r) => r.id));

  let dbVideos = rows.map((r) => mapRow(r, cdn, siteViewById.get(r.id) ?? 0));

  if (dbOnly) {
    return typeof limit === "number" && limit > 0 ? dbVideos.slice(0, limit) : dbVideos;
  }

  const exclude = new Set(dbVideos.map((v) => v.guid));
  const bunnyOpts = { ...options, excludeGuids: exclude };

  if (typeof limit === "number" && limit > 0) {
    if (dbVideos.length >= limit) {
      return dbVideos.slice(0, limit);
    }
    const need = limit - dbVideos.length;
    const bunny = await fetchWindowsVideos({
      ...bunnyOpts,
      limit: need + 24,
    });
    return [...dbVideos, ...bunny.slice(0, need)];
  }

  const bunny = await fetchWindowsVideos(bunnyOpts);
  return [...dbVideos, ...bunny];
}

/**
 * Tək video GUID ilə gətirir — `/windows/[guid]` səhifəsi üçün.
 */
export async function fetchSingleStreamVideo(
  guid: string,
  runtimeEnv?: Record<string, string | undefined>
): Promise<WindowsVideo | null> {
  if (!guid?.trim()) return null;

  const cdn =
    readEnv("BUNNY_STREAM_CDN_HOSTNAME", runtimeEnv) ||
    "vz-300fcde7-b36.b-cdn.net";

  let selectStr = STREAM_SELECT_FULL;

  let { data, error } = await supabaseAdmin
    .from("stream_video")
    .select(selectStr)
    .eq("bunny_video_guid", guid.trim())
    .eq("published", true)
    .maybeSingle();

  if (error && streamMetaColumnsMissingFromDbError(error.message)) {
    selectStr = STREAM_SELECT_FULL_LEGACY;
    const legacy = await supabaseAdmin
      .from("stream_video")
      .select(selectStr)
      .eq("bunny_video_guid", guid.trim())
      .eq("published", true)
      .maybeSingle();
    data = legacy.data;
    error = legacy.error;
  }

  if (error || !data) return null;

  let rows = [data as StreamVideoRow];
  rows = await enrichStreamRowsFromBunny(rows, runtimeEnv);

  const siteViewById = await fetchSiteViewCountsByVideoIds(rows.map((r) => r.id));
  return mapRow(rows[0], cdn, siteViewById.get(rows[0].id) ?? 0);
}

export async function fetchAllStreamVideosForWindows(
  runtimeEnv?: Record<string, string | undefined>
): Promise<WindowsVideo[]> {
  return fetchHomeStreamVideos({ runtimeEnv });
}
