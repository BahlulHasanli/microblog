import type { APIRoute } from "astro";
import { supabase } from "@/db/supabase";

export const GET: APIRoute = async (context) => {
  try {
    const { id } = context.params;

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Share ID tələb olunur",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get current user blocks
    const { data: userData } = await supabase.auth.getUser();
    const currentUserId = userData?.user?.id;
    let blockedUserIds: string[] = [];

    if (currentUserId) {
      const { data: blocks } = await supabase
        .from("user_blocks")
        .select("blocker_id, blocked_id")
        .or(`blocker_id.eq.${currentUserId},blocked_id.eq.${currentUserId}`);

      if (blocks) {
        blockedUserIds = blocks.map(b => b.blocker_id === currentUserId ? b.blocked_id : b.blocker_id);
      }
    }

    // Fetch comments for this share
    let query = supabase
      .from("share_comments")
      .select("*, users:user_id(id, fullname, username, avatar)")
      .eq("share_id", id)
      .order("created_at", { ascending: true });

    if (blockedUserIds.length > 0) {
      query = query.not("user_id", "in", `(${blockedUserIds.join(",")})`);
    }

    const { data: comments, error } = await query;

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        comments: comments || [],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Comments fetch xətası:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Xəta baş verdi",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
