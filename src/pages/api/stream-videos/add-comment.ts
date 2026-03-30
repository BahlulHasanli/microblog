import type { APIRoute } from "astro";
import { supabaseAdmin } from "@/db/supabase";
import { getUserFromCookies } from "@/utils/auth";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async (context) => {
  try {
    const user = await getUserFromCookies(context.cookies, () => null);

    const body = await context.request.json().catch(() => null);
    const streamVideoId = typeof body?.streamVideoId === "string" ? body.streamVideoId.trim() : "";
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    const guestName =
      typeof body?.guestName === "string" ? body.guestName.trim() : "";
    const guestEmail =
      typeof body?.guestEmail === "string" ? body.guestEmail.trim() : "";

    if (!streamVideoId) {
      return new Response(JSON.stringify({ success: false, message: "streamVideoId tələb olunur" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!content) {
      return new Response(JSON.stringify({ success: false, message: "Şərh boş ola bilməz" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (content.length > 1000) {
      return new Response(
        JSON.stringify({ success: false, message: "Şərh 1000 simvoldan çox ola bilməz" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!user) {
      if (!guestName) {
        return new Response(
          JSON.stringify({ success: false, message: "Zəhmət olmasa ad və soyadınızı daxil edin" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      if (!guestEmail || !emailRe.test(guestEmail)) {
        return new Response(
          JSON.stringify({ success: false, message: "Düzgün email ünvanı daxil edin" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    const { data: exists } = await supabaseAdmin
      .from("stream_video")
      .select("id")
      .eq("id", streamVideoId)
      .maybeSingle();

    if (!exists) {
      return new Response(JSON.stringify({ success: false, message: "Video tapılmadı" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const insertRow = user
      ? {
          stream_video_id: streamVideoId,
          user_id: user.id,
          content,
        }
      : {
          stream_video_id: streamVideoId,
          user_id: null as null,
          content,
          user_email: guestEmail,
          user_name: guestName,
          user_fullname: guestName,
        };

    const { data, error } = await supabaseAdmin
      .from("stream_video_comments")
      .insert(insertRow)
      .select("id, content, created_at, user_id, user_name, user_fullname")
      .single();

    if (error) {
      console.error("[stream-videos/add-comment]", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: error.message.includes("stream_video_comments")
            ? "Şərh cədvəli mövcud deyil — migrasiyanı tətbiq edin"
            : error.message.includes("stream_video_comments_author_chk")
              ? "Ad və email mütləqdir"
              : error.message,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const commentOut = user
      ? {
          ...data,
          users: {
            fullname: user.fullname,
            username: user.username,
            avatar: user.avatar ?? null,
          },
        }
      : {
          ...data,
          users: {
            fullname: data.user_fullname || data.user_name || "Qonaq",
            username: data.user_name || "",
            avatar: null as string | null,
          },
        };

    return new Response(JSON.stringify({ success: true, comment: commentOut }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[stream-videos/add-comment]", e);
    return new Response(JSON.stringify({ success: false, message: "Server xətası" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
