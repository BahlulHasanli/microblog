import type { APIRoute } from "astro";
import { supabase } from "@/db/supabase";

export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    const accessToken = cookies.get("sb-access-token")?.value;

    if (!accessToken) {
      return new Response(JSON.stringify({ played: false, score: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return new Response(JSON.stringify({ played: false, score: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const playDate =
      url.searchParams.get("date") || new Date().toISOString().split("T")[0];

    // İstifadəçinin bugünkü skorunu yoxla
    const { data: scoreData, error: scoreError } = await supabase
      .from("krosswordle_scores")
      .select("*")
      .eq("user_id", user.id)
      .eq("play_date", playDate)
      .single();

    if (scoreError && scoreError.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("Skor yoxlama xətası:", scoreError);
    }

    const played = !!scoreData;

    return new Response(
      JSON.stringify({
        played,
        score: scoreData
          ? {
              completionTime: scoreData.completion_time,
              levelId: scoreData.level_id,
              playDate: scoreData.play_date,
            }
          : null,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("API xətası:", error);
    return new Response(JSON.stringify({ played: false, score: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};
