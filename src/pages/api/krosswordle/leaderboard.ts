import type { APIRoute } from "astro";
import { supabase } from "@/db/supabase";

export const GET: APIRoute = async ({ url }) => {
  try {
    const type = url.searchParams.get("type") || "monthly";
    const now = new Date();
    const year = parseInt(url.searchParams.get("year") || String(now.getFullYear()));
    const month = parseInt(url.searchParams.get("month") || String(now.getMonth() + 1));

    let data, error;

    if (type === "monthly") {
      // Aylıq reytinq - xal sistemi ilə
      const result = await supabase.rpc("get_monthly_leaderboard", {
        target_year: year,
        target_month: month,
      });
      data = result.data;
      error = result.error;

      // Əgər bu ay üçün data yoxdursa, ən son ayı tap
      if (!error && (!data || data.length === 0)) {
        const latestDateResult = await supabase
          .from("krosswordle_scores")
          .select("play_date")
          .order("play_date", { ascending: false })
          .limit(1)
          .single();

        if (latestDateResult.data && latestDateResult.data.play_date) {
          const latestDate = new Date(latestDateResult.data.play_date);
          const latestYear = latestDate.getFullYear();
          const latestMonth = latestDate.getMonth() + 1;
          
          const fallbackResult = await supabase.rpc("get_monthly_leaderboard", {
            target_year: latestYear,
            target_month: latestMonth,
          });
          data = fallbackResult.data;
          error = fallbackResult.error;
        }
      }
    } else if (type === "all-time") {
      const result = await supabase.rpc("get_all_time_leaderboard");
      data = result.data;
      error = result.error;
    } else {
      return new Response(JSON.stringify({ error: "Yanlış tip" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (error) {
      console.error("Leaderboard xətası:", error);
      return new Response(JSON.stringify({ error: "Leaderboard yüklənmədi" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data, year, month }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("API xətası:", error);
    return new Response(JSON.stringify({ error: "Server xətası" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

