import type { APIRoute } from "astro";
import { supabase } from "@/db/supabase";
import { getUserFromCookies } from "@/utils/auth";

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const user = await getUserFromCookies(cookies, null);

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, message: "Giriş tələb olunur" }),
        { headers: { "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Bütün postlardan likes_count-u al
    const { data: shares, error } = await supabase
      .from("share_likes")
      .select("*");

    if (error) {
      console.error("Posts fetch error:", error);
      return new Response(
        JSON.stringify({ success: false, message: "Xəta baş verdi" }),
        { headers: { "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Bütün bəyənmələrin ümumi sayını hesabla
    const totalLikes = shares?.length;

    return new Response(
      JSON.stringify({ success: true, totalLikes, count: totalLikes }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Likes list error:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Server xətası" }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
};
