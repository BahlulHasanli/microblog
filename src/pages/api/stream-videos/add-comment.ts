import type { APIRoute } from "astro";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getUserFromCookies } from "@/utils/auth";
import { getCloudflareWorkerEnv } from "@/lib/cf-worker-env";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SUPABASE_URL_FALLBACK = "https://upegfchzvcnmoxfwamod.supabase.co";

function supabaseProjectUrl(): string {
  const u = import.meta.env.PUBLIC_SUPABASE_URL;
  return typeof u === "string" && u.trim().length > 0 ? u.trim() : SUPABASE_URL_FALLBACK;
}

/**
 * Post şərhləri (`CommentForm`) brauzerdə birbaşa Supabase-ə yazır; serverdə isə
 * `stream_video_comments` üçün RLS-də INSERT siyasəti yoxdur — yalnız service role
 * RLS-i keçir. Cloudflare-da açar `cloudflare:workers` env-də və ya lokalda import.meta / process-də olur.
 */
function resolveServiceRoleKey(): string | undefined {
  const workerEnv = getCloudflareWorkerEnv();
  return (
    workerEnv.SUPABASE_SERVICE_ROLE_KEY ||
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY ||
    (typeof process !== "undefined" ? process.env.SUPABASE_SERVICE_ROLE_KEY : undefined)
  );
}

function createServiceRoleClient(serviceKey: string): SupabaseClient {
  return createClient(supabaseProjectUrl(), serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/** Mobil klaviatura / avtodoldurma ilə gələn görünməz simvolları təmizləyir */
function sanitizeGuestInput(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

export const POST: APIRoute = async (context) => {
  try {
    const serviceKey = resolveServiceRoleKey();
    if (!serviceKey?.trim()) {
      console.error("[stream-videos/add-comment] SUPABASE_SERVICE_ROLE_KEY tapılmadı (worker env / .env)");
      return new Response(
        JSON.stringify({
          success: false,
          message:
            "Şərh serverdən yazıla bilmədi: SUPABASE_SERVICE_ROLE_KEY təyin deyil. Cloudflare Pages → Settings → Environment variables (və ya `wrangler secret`) ilə əlavə edin; lokalda `.env`-ə yazın.",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }

    const db = createServiceRoleClient(serviceKey.trim());

    const user = await getUserFromCookies(
      context.cookies,
      () => null,
      context.request.headers,
    );

    const body = await context.request.json().catch(() => null);
    const streamVideoId = typeof body?.streamVideoId === "string" ? body.streamVideoId.trim() : "";
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    const guestName =
      typeof body?.guestName === "string" ? sanitizeGuestInput(body.guestName) : "";
    const guestEmail =
      typeof body?.guestEmail === "string" ? sanitizeGuestInput(body.guestEmail) : "";

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
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!user) {
      if (!guestName) {
        return new Response(
          JSON.stringify({ success: false, message: "Zəhmət olmasa ad və soyadınızı daxil edin" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      if (!guestEmail || !emailRe.test(guestEmail)) {
        return new Response(
          JSON.stringify({ success: false, message: "Düzgün email ünvanı daxil edin" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    const { data: exists } = await db.from("stream_video").select("id").eq("id", streamVideoId).maybeSingle();

    if (!exists) {
      return new Response(JSON.stringify({ success: false, message: "Video tapılmadı" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Post `CommentForm.svelte` ilə eyni məntiq: daxil olmuşda profil sahələri də göndərilir
    const insertRow = user
      ? {
          stream_video_id: streamVideoId,
          user_id: user.id,
          content,
          user_email: user.email ?? null,
          user_name: user.username ?? null,
          user_fullname: user.fullname ?? null,
        }
      : {
          stream_video_id: streamVideoId,
          user_id: null as null,
          content,
          user_email: guestEmail,
          user_name: guestName,
          user_fullname: guestName,
        };

    const { data, error } = await db
      .from("stream_video_comments")
      .insert(insertRow)
      .select("id, content, created_at, user_id, user_name, user_fullname")
      .single();

    if (error) {
      const code = "code" in error ? String((error as { code?: string }).code ?? "") : "";
      const msg = error.message || "";
      console.error("[stream-videos/add-comment]", { code, message: msg, details: (error as { details?: string }).details });

      const missingTable =
        code === "PGRST205" ||
        /Could not find the table.*in the schema cache/i.test(msg) ||
        /relation\s+["']?public\.stream_video_comments["']?\s+does not exist/i.test(msg);

      const authorCheck =
        msg.includes("stream_video_comments_author_chk") ||
        /check constraint.*stream_video_comments_author_chk/i.test(msg);

      let userMessage = msg;
      if (missingTable) {
        userMessage =
          "Şərh cədvəli API tərəfindən tapılmadı (PostgREST keşi / sxem). Supabase-də cədvəl varsa: Dashboard → Settings → API → Reload schema.";
      } else if (authorCheck) {
        userMessage = "Ad və email mütləqdir";
      }

      return new Response(JSON.stringify({ success: false, message: userMessage }), {
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
