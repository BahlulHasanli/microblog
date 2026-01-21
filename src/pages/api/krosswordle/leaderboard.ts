import type { APIRoute } from "astro";
import { supabase } from "@/db/supabase";

export const GET: APIRoute = async ({ url }) => {
  try {
    const type = url.searchParams.get("type") || "daily";
    const date =
      url.searchParams.get("date") || new Date().toISOString().split("T")[0];

    let data, error;

    if (type === "daily") {
      const result = await supabase.rpc("get_daily_leaderboard", {
        target_date: date,
      });
      data = result.data;
      error = result.error;
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

    return new Response(JSON.stringify({ data }), {
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
