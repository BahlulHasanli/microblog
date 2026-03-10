import type { APIRoute } from "astro";
import { requireAdmin } from "@/utils/auth";
import { supabaseAdmin } from "@/db/supabase";
import { slugifyCategory } from "@/utils/slugify-category";

export const POST: APIRoute = async (context) => {
  try {
    const adminCheck = await requireAdmin(context);
    if (adminCheck instanceof Response) {
      return adminCheck;
    }

    const body = await context.request.json();
    const { id, name, parent_id, sort_order } = body;

    if (!id || !name) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Bölmə ID və adı tələb olunur",
        }),
        { status: 400 },
      );
    }

    const slug = slugifyCategory(name);

    if (!slug) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Bölmə slug-ı yaradıla bilmədi",
        }),
        { status: 400 },
      );
    }

    const { data: category, error } = await supabaseAdmin
      .from("categories")
      .update({
        name,
        slug,
        parent_id: parent_id || null,
        sort_order: sort_order || 0,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Categories update error:", error);

      if (error.code === "23505") {
        // unique violation
        return new Response(
          JSON.stringify({
            success: false,
            message: "Bu adda/slug-da bölmə artıq mövcuddur",
          }),
          { status: 400 },
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          message: "Bölmə yenilənərkən xəta baş verdi",
        }),
        { status: 500 },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        category,
      }),
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Categories update error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Xəta baş verdi",
      }),
      { status: 500 },
    );
  }
};
