import type { APIRoute } from "astro";
import { requireModerator } from "@/utils/auth";
import { supabase } from "@/db/supabase";

export const GET: APIRoute = async (context) => {
  try {
    // Moderator yoxlaması (admin və moderator)
    const modCheck = await requireModerator(context);
    if (modCheck instanceof Response) {
      return modCheck;
    }

    // İstifadəçiləri çək
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "İstifadəçilər yüklənərkən xəta baş verdi",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        users: data || [],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("İstifadəçi siyahısı xətası:", error);
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
