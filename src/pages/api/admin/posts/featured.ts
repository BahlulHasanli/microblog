import type { APIRoute } from "astro";
import { requireAdmin } from "@/utils/auth";
import { supabase } from "@/db/supabase";

export const POST: APIRoute = async (context) => {
  try {
    // Admin yoxlaması
    const adminCheck = await requireAdmin(context);
    if (adminCheck instanceof Response) {
      return adminCheck;
    }

    const { postId, featured } = await context.request.json();

    if (!postId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Post ID tələb olunur",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Əgər post önə çıxarılırsa, əvvəlcə bütün digər postların featured-ini false et
    if (featured === true) {
      await supabase
        .from("posts")
        .update({ featured: false })
        .neq("id", postId);
    }

    // Supabase-də postu yenilə
    const { data, error } = await supabase
      .from("posts")
      .update({
        featured: featured === true,
        updated_at: new Date().toISOString()
      })
      .eq("id", postId)
      .select()
      .single();

    if (error) {
      console.error("Supabase update xətası:", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Post tapılmadı və ya yenilənə bilmədi",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: featured ? "Post önə çıxarıldı" : "Post önə çıxarmadan çıxarıldı",
        post: data
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Featured toggle xətası:", error);
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
