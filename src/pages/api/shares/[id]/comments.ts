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

    // Fetch comments for this share
    const { data: comments, error } = await supabase
      .from("share_comments")
      .select("*, users:user_id(id, fullname, username, avatar)")
      .eq("share_id", id)
      .order("created_at", { ascending: true });

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
