import type { APIRoute } from "astro";
import { requireAdmin } from "@/utils/auth";
import { supabase } from "@/db/supabase";

export const GET: APIRoute = async (context) => {
  try {
    const adminCheck = await requireAdmin(context);
    if (adminCheck instanceof Response) {
      return adminCheck;
    }

    const { data: categories, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      console.error("Categories get error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Bölmələr yüklənərkən xəta baş verdi",
        }),
        { status: 500 },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        categories,
      }),
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Categories get error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Xəta baş verdi",
      }),
      { status: 500 },
    );
  }
};
