import type { APIRoute } from "astro";
import { hasSupabaseServiceRole, supabaseAdmin } from "@/db/supabase";

export const prerender = false;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function clientIp(request: Request, clientAddress?: string): string {
  const ordered = [
    request.headers.get("cf-connecting-ip"),
    request.headers.get("CF-Connecting-IP"),
    request.headers.get("true-client-ip"),
    request.headers.get("True-Client-IP"),
  ];
  for (const h of ordered) {
    const v = h?.trim();
    if (v) return v.split(",")[0]!.trim().slice(0, 128);
  }
  const astro = clientAddress?.trim();
  if (astro) return astro.split(",")[0]!.trim().slice(0, 128);
  const xff = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (xff) return xff.slice(0, 128);
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 128);
  return "unknown";
}

/** Yalnız ictimai IP üçün ip: dedupe — əks halda anon UUID (lokal / header yox) */
function isPlausiblePublicClientIp(s: string): boolean {
  if (!s || s === "unknown") return false;
  const ip = s.trim();
  if (ip === "::1" || ip === "0:0:0:0:0:0:0:1") return false;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if ([a, b, Number(m[3]), Number(m[4])].some((n) => n > 255)) return false;
    if (a === 10) return false;
    if (a === 127) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 169 && b === 254) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    return true;
  }
  if (ip.includes(":")) {
    const lower = ip.toLowerCase();
    if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return false;
    if (lower.startsWith("::ffff:")) {
      const v4 = lower.slice(7);
      return isPlausiblePublicClientIp(v4);
    }
    return true;
  }
  return false;
}

function buildDedupeKey(
  request: Request,
  clientAddress: string | undefined,
  viewerId: string | undefined
): string {
  const raw = clientIp(request, clientAddress);
  if (isPlausiblePublicClientIp(raw)) {
    return `ip:${raw.slice(0, 128)}`;
  }
  const vid = typeof viewerId === "string" ? viewerId.trim() : "";
  if (vid && UUID_RE.test(vid)) {
    return `anon:${vid}`;
  }
  return "anon:unknown";
}

function parseRpcBigint(data: unknown): number | null {
  if (data == null) return null;
  if (typeof data === "number" && Number.isFinite(data)) return Math.floor(data);
  if (typeof data === "string") {
    const n = Number(data);
    return Number.isFinite(n) ? Math.floor(n) : null;
  }
  return null;
}

/**
 * Sayt baxışı: ictimai IP varsa (ip:...) hər IP üçün bir dəfə; yoxdakı hallarda brauzer viewerId (anon:...).
 */
export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    if (!hasSupabaseServiceRole) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "SUPABASE_SERVICE_ROLE_KEY yoxdur — sayğac üçün server açarı lazımdır",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await request.json().catch(() => null);
    const streamVideoId = typeof body?.streamVideoId === "string" ? body.streamVideoId.trim() : "";
    const viewerId = typeof body?.viewerId === "string" ? body.viewerId.trim() : "";

    if (!streamVideoId || !UUID_RE.test(streamVideoId)) {
      return new Response(JSON.stringify({ success: false, message: "streamVideoId tələb olunur" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: exists } = await supabaseAdmin
      .from("stream_video")
      .select("id")
      .eq("id", streamVideoId)
      .eq("published", true)
      .maybeSingle();

    if (!exists) {
      return new Response(JSON.stringify({ success: false, message: "Video tapılmadı" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const dedupeKey = buildDedupeKey(request, clientAddress, viewerId || undefined);

    const { data, error } = await supabaseAdmin.rpc("record_stream_video_site_view", {
      p_id: streamVideoId,
      p_dedupe_key: dedupeKey,
    });

    if (error) {
      if (
        error.message?.includes("record_stream_video_site_view") ||
        error.message?.includes("record_stream_video_site_view_by_ip") ||
        error.message?.includes("increment_stream_video_site_views") ||
        error.message?.includes("function")
      ) {
        console.error("[stream-videos/record-view] RPC / sxem xətası", error.message);
        return new Response(
          JSON.stringify({
            success: false,
            message: "Sayğac funksiyası yoxdur və ya köhnədir — Supabase migrasiyasını tətbiq edin (20260414)",
          }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        );
      }
      console.error("[stream-videos/record-view]", error);
      return new Response(JSON.stringify({ success: false, message: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const count = parseRpcBigint(data);

    return new Response(JSON.stringify({ success: true, siteViewCount: count }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[stream-videos/record-view]", e);
    return new Response(JSON.stringify({ success: false, message: "Server xətası" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
