import type { APIRoute } from "astro";
import { requireAuth } from "@/utils/auth";
import { supabaseAdmin } from "@/db/supabase";
import { parseBunnyStreamPlaylistUrl } from "@/lib/bunny-hls-url";

function isStreamVideoUploader(u: { role_id?: number }): boolean {
  return u?.role_id === 1;
}

export const POST: APIRoute = async (context) => {
  try {
    const user = await requireAuth(context);
    if (user instanceof Response) return user;

    if (!isStreamVideoUploader(user)) {
      return new Response(JSON.stringify({ success: false, message: "Video əlavə etmək üçün admin hüququ lazımdır" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await context.request.json().catch(() => null);
    const playlistUrl = typeof body?.playlistUrl === "string" ? body.playlistUrl.trim() : "";
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const descriptionRaw = typeof body?.description === "string" ? body.description.trim() : "";
    const description = descriptionRaw.length > 0 ? descriptionRaw.slice(0, 8000) : null;
    const categoryIdRaw = typeof body?.categoryId === "string" ? body.categoryId.trim() : "";

    if (!playlistUrl) {
      return new Response(JSON.stringify({ success: false, message: "HLS playlist URL daxil edin" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const parsed = parseBunnyStreamPlaylistUrl(playlistUrl);
    if (!parsed) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            "URL tanınmadı. Nümunə: https://vz-xxxx.b-cdn.net/VIDEO-GUID/playlist.m3u8 (və ya .m3u8 ilə bitən HLS linki)",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!title) {
      return new Response(JSON.stringify({ success: false, message: "Başlıq daxil edin" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!categoryIdRaw) {
      return new Response(JSON.stringify({ success: false, message: "Kateqoriya seçin" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: catRow, error: catErr } = await supabaseAdmin
      .from("stream_video_category")
      .select("id")
      .eq("id", categoryIdRaw)
      .maybeSingle();

    if (catErr || !catRow) {
      return new Response(JSON.stringify({ success: false, message: "Kateqoriya tapılmadı" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("stream_video")
      .insert({
        bunny_video_guid: parsed.guid,
        title,
        description,
        user_id: user.id,
        category_id: categoryIdRaw,
        published: true,
      })
      .select("id")
      .single();

    if (insErr) {
      const msg = insErr.message || "";
      if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("stream_video_bunny_video_guid")) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Bu video GUID artıq saytda qeydiyyatdan keçib",
          }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      }
      console.error("[stream-video/register-url] DB insert", insErr);
      return new Response(
        JSON.stringify({
          success: false,
          message: insErr.message.includes("stream_video")
            ? "Verilənlər bazası: stream_video — migrasiya tətbiq edin"
            : insErr.message,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: inserted?.id,
        bunnyGuid: parsed.guid,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[stream-video/register-url]", e);
    return new Response(JSON.stringify({ success: false, message: "Server xətası" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
