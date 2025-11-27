import type { APIRoute } from "astro";
import { supabase } from "@/db/supabase";
import { requireAuth } from "@/utils/auth";

export const POST: APIRoute = async (context) => {
  try {
    // Autentifikasiya yoxla
    const user = await requireAuth(context);

    if (user instanceof Response) {
      return user;
    }

    const { commentId } = await context.request.json();

    // Validasiya
    if (!commentId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Comment ID tələb olunur",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Artıq mövcud like-u yoxla
    const { data: existingLike, error: selectError } = await supabase
      .from("share_comment_likes")
      .select("*")
      .eq("comment_id", commentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (selectError) {
      console.error("Select error:", selectError);
      throw selectError;
    }

    if (existingLike) {
      // Əgər varsa, sil (toggle off)
      const { error: deleteError } = await supabase
        .from("share_comment_likes")
        .delete()
        .eq("id", existingLike.id);

      if (deleteError) {
        throw deleteError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: "removed",
          message: "Like silindi",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } else {
      // Əgər yoxsa, əlavə et (toggle on)
      const { error: insertError } = await supabase
        .from("share_comment_likes")
        .insert({
          comment_id: commentId,
          user_id: user.id,
        });

      if (insertError) {
        throw insertError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: "added",
          message: "Like əlavə edildi",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error: any) {
    console.error("Comment like toggle xətası:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error?.message || "Xəta baş verdi",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
