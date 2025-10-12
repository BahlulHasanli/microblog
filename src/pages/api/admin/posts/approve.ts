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

    const { postId, approve } = await context.request.json();

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

    // Supabase-də postu yenilə
    const updateData: any = {
      approved: approve !== false,
      updated_at: new Date().toISOString()
    };

    // Yayımdan çıxardıqda featured də false olsun
    if (approve === false) {
      updateData.featured = false;
    }

    const { data, error } = await supabase
      .from("posts")
      .update(updateData)
      .eq("slug", postId)
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
        message: approve === false ? "Post yayımdan çıxarıldı" : "Post uğurla təsdiq edildi",
        post: data
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Post təsdiq xətası:", error);
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
