import type { APIRoute } from "astro";
import { supabaseAdmin } from "@/db/supabase";

export const GET: APIRoute = async ({ url }) => {
  try {
    const streamVideoId = url.searchParams.get("streamVideoId")?.trim();
    if (!streamVideoId) {
      return new Response(JSON.stringify({ success: false, message: "streamVideoId tələb olunur" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: raw, error } = await supabaseAdmin
      .from("stream_video_comments")
      .select(
        "id, content, created_at, user_id, user_name, user_fullname, users:user_id (id, fullname, username, avatar)"
      )
      .eq("stream_video_id", streamVideoId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[stream-videos/comments]", error);
      return new Response(JSON.stringify({ success: false, message: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const comments = (raw ?? []).map((row: Record<string, unknown>) => {
      const uid = row.user_id;
      const u = row.users as { fullname?: string; username?: string; avatar?: string | null } | null;
      if (uid) {
        if (u) return row;
        return {
          ...row,
          users: {
            fullname: "İstifadəçi",
            username: "",
            avatar: null as string | null,
          },
        };
      }
      const name = (row.user_fullname as string) || (row.user_name as string) || "";
      return {
        ...row,
        users: {
          fullname: name || "Qonaq",
          username: (row.user_name as string) || "",
          avatar: null as string | null,
        },
      };
    });

    return new Response(JSON.stringify({ success: true, comments }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[stream-videos/comments]", e);
    return new Response(JSON.stringify({ success: false, message: "Server xətası" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
