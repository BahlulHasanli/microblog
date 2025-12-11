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

    // Share comments cədvəlindən şərhlər al
    const { data: shareComments, error } = await supabase
      .from("share_comments")
      .select("*");

    if (error) {
      console.error("Share comments fetch error:", error);
      return new Response(
        JSON.stringify({ success: false, message: "Xəta baş verdi" }),
        { headers: { "Content-Type": "application/json" }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, shareComments: shareComments || [] }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Share comments list error:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Server xətası" }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
};
