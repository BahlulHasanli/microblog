import type { APIRoute } from "astro";
import { getSupabaseAdmin, type SupabaseRuntimeEnv } from "@/db/supabase";
import { getUserFromCookies } from "@/utils/auth";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async (context) => {
  try {
    const runtimeEnv = (context.locals as { runtime?: { env?: SupabaseRuntimeEnv } })?.runtime?.env;
    const admin = getSupabaseAdmin(runtimeEnv);

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

    const { data: exists } = await admin
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

    const { data, error } = await admin
      .from("stream_video_comments")
      .insert(insertRow)
      .select("id, content, created_at, user_id, user_name, user_fullname")
      .single();

    if (error) {
      console.error("[stream-videos/add-comment]", error);
      const msg = error.message;
      const code = "code" in error ? String((error as { code?: string }).code ?? "") : "";
      // PG check constraint: mesajda həmişə cədvəl adı da olur — əvvəlcə author_chk yoxlanmalıdır
      const isAuthorCheck =
        msg.includes("stream_video_comments_author_chk") ||
        (code === "23514" && /author_chk/i.test(msg));
      const isMissingCommentsTable =
        /relation ["'][^"']*stream_video_comments["'] does not exist/i.test(msg) ||
        /Could not find the table[^\n]*stream_video_comments/i.test(msg) ||
        (code === "42P01" && msg.includes("stream_video_comments"));
      const isRlsViolation =
        /row level security/i.test(msg) ||
        /violates row-level security/i.test(msg) ||
        (code === "42501" && msg.includes("stream_video_comments"));

      let clientMessage = msg;
      if (isAuthorCheck) {
        clientMessage = "Ad və email mütləqdir";
      } else if (isMissingCommentsTable) {
        clientMessage = "Şərh cədvəli mövcud deyil — migrasiyanı tətbiq edin";
      } else if (isRlsViolation) {
        clientMessage =
          "Şərh yazmaq üçün serverdə SUPABASE_SERVICE_ROLE_KEY lazımdır (məs. Cloudflare Pages → Environment variables).";
      }

      return new Response(JSON.stringify({ success: false, message: clientMessage }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
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
