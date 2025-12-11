import type { APIRoute } from "astro";
import { supabase } from "@/db/supabase";
import { getUserFromCookies } from "@/utils/auth";

export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    const user = await getUserFromCookies(cookies, null);

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, message: "Giriş tələb olunur" }),
        { headers: { "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Share ID parametrini al (opsional)
    const shareId = url.searchParams.get("share_id");

    let query = supabase.from("share_likes").select(`
        *,
        users:user_id (
          fullname,
          avatar
        )
      `);

    // Əgər share_id verilmişsə, filtrələ
    if (shareId) {
      query = query.eq("share_id", shareId);
    }

    const { data: likes, error } = await query;

    if (error) {
      console.error("Share likes fetch error:", error);
      return new Response(
        JSON.stringify({ success: false, message: "Xəta baş verdi" }),
        { headers: { "Content-Type": "application/json" }, status: 500 }
      );
    }

    return new Response(JSON.stringify({ success: true, likes: likes || [] }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Share likes list error:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Server xətası" }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
};
