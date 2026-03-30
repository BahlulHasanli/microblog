import type { APIRoute } from "astro";
import { supabase } from "@/db/supabase";

export const prerender = false;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** `post_views` API ilə eyni sıra; Cloudflare üçün əvvəlcə cf-connecting-ip */
function clientIp(request: Request, clientAddress?: string): string {
  const cf = request.headers.get("cf-connecting-ip")?.split(",")[0]?.trim();
  if (cf) return cf.slice(0, 45);
  const astro = clientAddress?.trim();
  if (astro) return astro.split(",")[0]!.trim().slice(0, 45);
  const xff = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (xff) return xff.slice(0, 45);
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 45);
  return "unknown";
}

async function countSiteViews(streamVideoId: string): Promise<number> {
  const { count, error } = await supabase
    .from("stream_video_site_views")
    .select("*", { count: "exact", head: true })
    .eq("stream_video_id", streamVideoId);

  if (error) {
    console.error("[stream-videos/record-view] count", error);
    return 0;
  }
  return count ?? 0;
}

/**
 * Post baxışı (`/api/posts/views`) ilə eyni: hər IP + video üçün bir sətir, anon Supabase + RLS.
 */
export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const body = await request.json().catch(() => null);
    const streamVideoId = typeof body?.streamVideoId === "string" ? body.streamVideoId.trim() : "";

    if (!streamVideoId || !UUID_RE.test(streamVideoId)) {
      return new Response(JSON.stringify({ success: false, message: "streamVideoId tələb olunur" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: videoRow } = await supabase
      .from("stream_video")
      .select("id")
      .eq("id", streamVideoId)
      .eq("published", true)
      .maybeSingle();

    if (!videoRow) {
      return new Response(JSON.stringify({ success: false, message: "Video tapılmadı" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const ip = clientIp(request, clientAddress);

    const { data: existingView } = await supabase
      .from("stream_video_site_views")
      .select("stream_video_id")
      .eq("stream_video_id", streamVideoId)
      .eq("ip_address", ip)
      .maybeSingle();

    if (existingView) {
      const n = await countSiteViews(streamVideoId);
      return new Response(JSON.stringify({ success: true, siteViewCount: n }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { error: insertError } = await supabase.from("stream_video_site_views").insert({
      stream_video_id: streamVideoId,
      ip_address: ip,
    });

    if (insertError) {
      if (insertError.code === "23505") {
        const n = await countSiteViews(streamVideoId);
        return new Response(JSON.stringify({ success: true, siteViewCount: n }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      console.error("[stream-videos/record-view] insert", insertError);
      return new Response(JSON.stringify({ success: false, message: insertError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const siteViewCount = await countSiteViews(streamVideoId);

    return new Response(JSON.stringify({ success: true, siteViewCount }), {
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
