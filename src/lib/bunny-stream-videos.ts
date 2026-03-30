/**
 * Bunny Stream API — https://docs.bunny.net/api-reference/stream
 * GET /library/{libraryId}/videos?collection=... (kolleksiya GUID)
 */

const API_BASE = "https://video.bunnycdn.com";

const DEFAULT_LIBRARY_ID = 486986;
const DEFAULT_CDN_HOSTNAME = "vz-300fcde7-b36.b-cdn.net";
const DEFAULT_COLLECTION_NAME = "frames";

/**
 * VideoModel status (Bunny): 4 = Finished, 8 = JitPlaylistsCreated (adətən oynatıla bilər)
 * @see https://docs.bunny.net/reference/video_list
 */
const PLAYABLE_STATUSES = new Set([4, 8]);

export type WindowsVideo = {
  /** Supabase stream_video.id — şərhlər üçün */
  streamVideoId?: string | null;
  guid: string;
  videoUrl: string;
  title: string;
  /** DB və ya Bunny API təsviri */
  description?: string | null;
  authorName: string;
  authorAvatar: string;
  thumbnail: string;
  duration: string;
  category: string;
  /** Bunny Stream baxış sayı (mövcud deyilsə null) */
  viewCount?: number | null;
  /** Saytda baxış sayı — `stream_video_site_views` sətirlərinin sayı */
  siteViewCount?: number | null;
};

type BunnyMetaTag = {
  property?: string | null;
  value?: string | null;
};

type BunnyVideoItem = {
  guid: string;
  title: string;
  length: number;
  status: number;
  category?: string | null;
  description?: string | null;
  metaTags?: BunnyMetaTag[] | null;
  /** Paneldə seçilmiş thumbnail; boşdursa adətən `thumbnail.jpg` */
  thumbnailFileName?: string | null;
  thumbnailUpdatedAt?: string | null;
  views?: number | null;
};

type BunnyListResponse<T> = {
  items?: T[] | null;
};

/**
 * Bunny sənədləşməsi: `https://{pull_zone}/{video_id}/{thumbnail_file_name}`
 */
/**
 * @param cacheBust — Bunny `thumbnailUpdatedAt` və ya son sinxron; eyni fayl adı ilə yeni şəkil üçün brauzer keşini sındırır
 */
export function buildBunnyStreamThumbnailUrl(
  cdnHostname: string,
  videoGuid: string,
  thumbnailFileName?: string | null,
  cacheBust?: string | null
): string {
  const host = cdnHostname.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const guid = videoGuid?.trim();
  const file = (thumbnailFileName?.trim() || "thumbnail.jpg").replace(/^\/+/, "");
  const safe = file
    .split("/")
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  let url = `https://${host}/${guid}/${safe}`;
  const v = cacheBust?.trim();
  if (v) {
    url += `?v=${encodeURIComponent(v)}`;
  }
  return url;
}

function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function metaValue(metaTags: BunnyMetaTag[] | null | undefined, key: string): string {
  if (!metaTags?.length) return "";
  const k = key.toLowerCase();
  for (const t of metaTags) {
    if ((t.property ?? "").toLowerCase() === k) {
      return (t.value ?? "").trim();
    }
  }
  return "";
}

function mapBunnyItem(v: BunnyVideoItem, cdnHostname: string): WindowsVideo {
  const host = cdnHostname.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const base = `https://${host}/${v.guid}`;
  const author =
    metaValue(v.metaTags, "author") ||
    metaValue(v.metaTags, "editor") ||
    metaValue(v.metaTags, "müəllif") ||
    "";
  const categoryFromMeta =
    metaValue(v.metaTags, "category") ||
    metaValue(v.metaTags, "bölmə") ||
    metaValue(v.metaTags, "kateqoriya");
  const category = (categoryFromMeta || v.category || "Pəncərələr").trim();

  const desc = v.description?.trim();
  return {
    streamVideoId: null,
    guid: v.guid,
    videoUrl: `${base}/playlist.m3u8`,
    title: v.title?.trim() || "Video",
    description: desc && desc.length > 0 ? desc : null,
    authorName: author || "The 99",
    authorAvatar: metaValue(v.metaTags, "avatar") || "",
    thumbnail: buildBunnyStreamThumbnailUrl(
      cdnHostname,
      v.guid,
      v.thumbnailFileName,
      v.thumbnailUpdatedAt
    ),
    duration: formatDuration(v.length),
    category,
    viewCount: typeof v.views === "number" && Number.isFinite(v.views) && v.views >= 0 ? Math.floor(v.views) : null,
  };
}

function pickCollectionGuid(
  items: { guid?: string; name?: string }[],
  collectionName: string
): string | null {
  const lower = collectionName.toLowerCase();
  const exact = items.find((c) => (c.name ?? "").toLowerCase() === lower);
  if (exact?.guid) return exact.guid;
  const partial = items.find((c) => (c.name ?? "").toLowerCase().includes(lower));
  return partial?.guid ?? null;
}

async function resolveCollectionGuid(
  apiKey: string,
  libraryId: number,
  collectionName: string
): Promise<string | null> {
  const headers = { AccessKey: apiKey };

  const tryList = async (search: string) => {
    const q = search ? `&search=${encodeURIComponent(search)}` : "";
    const res = await fetch(
      `${API_BASE}/library/${libraryId}/collections?itemsPerPage=100${q}`,
      { headers }
    );
    if (!res.ok) return [] as { guid?: string; name?: string }[];
    const data = (await res.json()) as BunnyListResponse<{ guid?: string; name?: string }>;
    return data.items ?? [];
  };

  let items = await tryList(collectionName);
  let guid = pickCollectionGuid(items, collectionName);
  if (guid) return guid;

  items = await tryList("");
  guid = pickCollectionGuid(items, collectionName);
  return guid;
}

function readEnv(name: string, runtimeEnv?: Record<string, string | undefined>): string | undefined {
  const fromRuntime = runtimeEnv?.[name];
  if (fromRuntime !== undefined && fromRuntime !== "") return fromRuntime;
  return (import.meta.env as Record<string, string | undefined>)[name];
}

export type BunnyVideoDetails = {
  ok: boolean;
  lengthSeconds: number | null;
  /** CDN-də `{guid}/{thumbnailFileName}` — fərdi thumbnail üçün */
  thumbnailFileName: string | null;
  /** Paneldə thumbnail dəyişəndə yenilənir — cache bust üçün */
  thumbnailUpdatedAt: string | null;
  /** Bunny `VideoModel.views` */
  views: number | null;
};

/**
 * Tək video meta: müddət + thumbnail (fayl adı + yenilənmə vaxtı).
 */
export async function fetchBunnyVideoDetails(params: {
  apiKey: string;
  libraryId: number;
  guid: string;
}): Promise<BunnyVideoDetails> {
  const empty: BunnyVideoDetails = {
    ok: false,
    lengthSeconds: null,
    thumbnailFileName: null,
    thumbnailUpdatedAt: null,
    views: null,
  };
  const guid = params.guid?.trim();
  if (!guid) return empty;

  const res = await fetch(`${API_BASE}/library/${params.libraryId}/videos/${guid}`, {
    headers: { AccessKey: params.apiKey, Accept: "application/json" },
  });

  if (!res.ok) {
    return empty;
  }

  let data: {
    length?: number;
    thumbnailFileName?: string | null;
    thumbnailUpdatedAt?: string | null;
    views?: number | null;
  };
  try {
    data = (await res.json()) as {
      length?: number;
      thumbnailFileName?: string | null;
      thumbnailUpdatedAt?: string | null;
      views?: number | null;
    };
  } catch {
    return empty;
  }

  let lengthSeconds: number | null = null;
  const len = data.length;
  if (typeof len === "number" && Number.isFinite(len) && len >= 0) {
    lengthSeconds = Math.floor(len);
  }

  const thumb = data.thumbnailFileName?.trim();
  const thumbnailFileName = thumb && thumb.length > 0 ? thumb : null;
  const thumbnailUpdatedAt = data.thumbnailUpdatedAt?.trim() || null;

  let views: number | null = null;
  const v = data.views;
  if (typeof v === "number" && Number.isFinite(v) && v >= 0) {
    views = Math.floor(v);
  }

  return {
    ok: true,
    lengthSeconds,
    thumbnailFileName,
    thumbnailUpdatedAt,
    views,
  };
}

/** @deprecated İstifadə üçün `fetchBunnyVideoDetails` üstünlüklüdür */
export async function fetchBunnyVideoLengthSeconds(params: {
  apiKey: string;
  libraryId: number;
  guid: string;
}): Promise<number | null> {
  const d = await fetchBunnyVideoDetails(params);
  return d.lengthSeconds;
}

export type FetchWindowsVideosOptions = {
  /** Ana səhifə üçün məs. 4 */
  limit?: number;
  runtimeEnv?: Record<string, string | undefined>;
  /** DB-də artıq olan Bunny guid-ləri təkrarlamamaq üçün */
  excludeGuids?: Iterable<string>;
};

async function listVideosRaw(
  apiKey: string,
  libraryId: number,
  collectionQuery: string | null
): Promise<BunnyVideoItem[]> {
  const col = collectionQuery ? `&${collectionQuery}` : "";
  const listUrl = `${API_BASE}/library/${libraryId}/videos?itemsPerPage=100&orderBy=date${col}`;
  const res = await fetch(listUrl, {
    headers: { AccessKey: apiKey },
  });
  if (!res.ok) {
    console.warn("[bunny-stream] Video siyahısı:", res.status, await res.text().catch(() => ""));
    return [];
  }
  const data = (await res.json()) as BunnyListResponse<BunnyVideoItem>;
  return data.items ?? [];
}

function filterPlayable(items: BunnyVideoItem[]): BunnyVideoItem[] {
  return items.filter((v) => PLAYABLE_STATUSES.has(v.status));
}

/**
 * Bunny Stream-dən "frames" kolleksiyasındakı (və ya env ilə verilən) videoları gətirir.
 * Açar yoxdursa və ya xəta baş verərsə boş massiv qaytarır.
 */
export async function fetchWindowsVideos(
  options?: FetchWindowsVideosOptions
): Promise<WindowsVideo[]> {
  const re = options?.runtimeEnv;
  const apiKey = readEnv("BUNNY_STREAM_API_KEY", re);
  const libraryIdRaw = readEnv("BUNNY_STREAM_LIBRARY_ID", re);
  const libraryId = Number(libraryIdRaw || DEFAULT_LIBRARY_ID);
  const cdnHostname = readEnv("BUNNY_STREAM_CDN_HOSTNAME", re) || DEFAULT_CDN_HOSTNAME;
  const collectionName = readEnv("BUNNY_STREAM_COLLECTION_NAME", re) || DEFAULT_COLLECTION_NAME;
  const collectionIdEnv = readEnv("BUNNY_STREAM_COLLECTION_ID", re);

  if (!apiKey) {
    console.warn("[bunny-stream] BUNNY_STREAM_API_KEY təyin edilməyib");
    return [];
  }

  const strictCollection =
    readEnv("BUNNY_STREAM_STRICT_COLLECTION", re) === "1" ||
    readEnv("BUNNY_STREAM_STRICT_COLLECTION", re) === "true";

  let collectionId = collectionIdEnv?.trim() || null;
  if (!collectionId) {
    collectionId = await resolveCollectionGuid(apiKey, libraryId, collectionName);
  }

  let rawItems: BunnyVideoItem[] = [];

  if (collectionId) {
    rawItems = await listVideosRaw(
      apiKey,
      libraryId,
      `collection=${encodeURIComponent(collectionId)}`
    );
  }

  /* Video kolleksiyada deyilsə və ya kolleksiya tapılmadısa — bütün kitabxanadan götür (bir video kökdə olanda) */
  if (rawItems.length === 0 && !strictCollection) {
    if (!collectionId) {
      console.warn(`[bunny-stream] "${collectionName}" kolleksiyası tapılmadı — bütün kitabxana siyahılanır`);
    } else {
      console.warn(
        `[bunny-stream] Kolleksiyada hazır video yoxdur — bütün kitabxanadan götürülür (strict: BUNNY_STREAM_STRICT_COLLECTION=1)`
      );
    }
    rawItems = await listVideosRaw(apiKey, libraryId, null);
  }

  if (rawItems.length === 0 && strictCollection && !collectionId) {
    console.warn(`[bunny-stream] Kolleksiya tapılmadı və strict rejim aktivdir — siyahı boş qalır`);
    return [];
  }

  const playable = filterPlayable(rawItems);
  if (playable.length === 0 && rawItems.length > 0) {
    console.warn(
      "[bunny-stream] Videolar var amma hələ encode bitməyib (status ≠ Finished). Bunny panelində vəziyyəti yoxlayın."
    );
  }

  let mapped = playable.map((v) => mapBunnyItem(v, cdnHostname));

  const ex = options?.excludeGuids;
  if (ex) {
    const set = new Set(ex);
    mapped = mapped.filter((v) => !set.has(v.guid));
  }

  const limit = options?.limit;
  if (typeof limit === "number" && limit > 0) {
    return mapped.slice(0, limit);
  }
  return mapped;
}

/** Bunny-yə yükləmə üçün kolleksiya GUID (məs. frames) */
export async function fetchBunnyStreamCollectionGuid(
  runtimeEnv?: Record<string, string | undefined>
): Promise<string | null> {
  const apiKey = readEnv("BUNNY_STREAM_API_KEY", runtimeEnv);
  const libraryId = Number(readEnv("BUNNY_STREAM_LIBRARY_ID", runtimeEnv) || DEFAULT_LIBRARY_ID);
  const collectionName = readEnv("BUNNY_STREAM_COLLECTION_NAME", runtimeEnv) || DEFAULT_COLLECTION_NAME;
  const collectionIdEnv = readEnv("BUNNY_STREAM_COLLECTION_ID", runtimeEnv);
  if (!apiKey) return null;
  if (collectionIdEnv?.trim()) return collectionIdEnv.trim();
  return resolveCollectionGuid(apiKey, libraryId, collectionName);
}
