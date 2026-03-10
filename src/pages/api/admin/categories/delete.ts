import type { APIRoute } from "astro";
import { requireAdmin } from "@/utils/auth";
import { supabaseAdmin } from "@/db/supabase";

export const POST: APIRoute = async (context) => {
  try {
    const adminCheck = await requireAdmin(context);
    if (adminCheck instanceof Response) {
      return adminCheck;
    }

    const body = await context.request.json();
    const { id } = body;

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Bölmə ID tələb olunur",
        }),
        { status: 400 },
      );
    }

    // Əvvəlcə alt bölmələrın olub-olmadığını yoxla
    const { data: subCategories, error: subError } = await supabaseAdmin
      .from("categories")
      .select("id")
      .eq("parent_id", id)
      .limit(1);

    if (subError) {
      console.error("Categories check subcategories error:", subError);
    }

    if (subCategories && subCategories.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message:
            "Bu bölmənın alt bölmələrı var. Əvvəlcə onları silin.",
        }),
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Categories delete error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Bölmə silinərkən xəta baş verdi",
        }),
        { status: 500 },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Bölmə uğurla silindi",
      }),
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Categories delete error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Xəta baş verdi",
      }),
      { status: 500 },
    );
  }
};
