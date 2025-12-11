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

    // Pagination parametrləri
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "5");
    const offset = (page - 1) * limit;

    // Toplam sayı al
    const { count: totalCount } = await supabase
      .from("shares")
      .select("*", { count: "exact", head: true });

    // Paylaşımları al
    const { data: shares, error } = await supabase
      .from("shares")
      .select(
        `
        *,
        users:user_id (
          id,
          fullname,
          avatar
        )
      `
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Shares fetch error:", error);
      return new Response(
        JSON.stringify({ success: false, message: "Xəta baş verdi" }),
        { headers: { "Content-Type": "application/json" }, status: 500 }
      );
    }

    const totalPages = Math.ceil((totalCount || 0) / limit);

    return new Response(
      JSON.stringify({
        success: true,
        shares: shares || [],
        pagination: {
          page,
          limit,
          totalCount: totalCount || 0,
          totalPages,
        },
      }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Shares list error:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Server xətası" }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
};
