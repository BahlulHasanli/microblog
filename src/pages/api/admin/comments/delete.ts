import type { APIRoute } from "astro";
import { isAdmin } from "@/utils/auth";
import { supabaseAdmin } from "@/db/supabase";

export const POST: APIRoute = async ({ request, cookies }) => {
  // Admin kontrolü
  const adminCheck = await isAdmin(cookies);
  if (!adminCheck) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Yetkiniz yoxdur",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const { commentId } = await request.json();

    if (!commentId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Şərh ID-si tələb olunur",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Önce bu yorumun alt yorumlarını sil
    const { error: repliesError } = await supabaseAdmin
      .from("comments")
      .delete()
      .eq("parent_id", commentId);

    if (repliesError) {
      console.error("Cavablar silinərkən xəta:", repliesError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Cavablar silinərkən xəta baş verdi",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Sonra ana yorumu sil
    const { error: commentError } = await supabaseAdmin
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (commentError) {
      console.error("Şərh silinərkən xəta:", commentError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Şərh silinərkən xəta baş verdi",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Şərh uğurla silindi",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Şərh silinərkən xəta:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Server xətası",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
