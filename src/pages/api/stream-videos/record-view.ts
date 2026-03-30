import type { APIRoute } from "astro";
import { hasSupabaseServiceRole, supabaseAdmin } from "@/db/supabase";

export const prerender = false;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function clientIp(request: Request, clientAddress?: string): string {
  const cf = request.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf.slice(0, 128);
  const astro = clientAddress?.trim();
  if (astro) return astro.slice(0, 128);
  const xff = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (xff) return xff.slice(0, 128);
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 128);
  return "unknown";
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
 * Sayt baxışı: eyni IP + video üçün bir dəfə sayılır (post_views məntiqi).
 * Bunny panel statistikası ilə əlaqəsi yoxdur.
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

    const ip = clientIp(request, clientAddress);

    const { data, error } = await supabaseAdmin.rpc("record_stream_video_site_view_by_ip", {
      p_id: streamVideoId,
      p_ip: ip,
    });

    if (error) {
      if (
        error.message?.includes("record_stream_video_site_view_by_ip") ||
        error.message?.includes("increment_stream_video_site_views") ||
        error.message?.includes("function")
      ) {
        console.error("[stream-videos/record-view] RPC yoxdur — migrasiya tətbiq edin", error.message);
        return new Response(
          JSON.stringify({
            success: false,
            message: "Sayğac funksiyası yoxdur — server migrasiyasını işə salın",
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
