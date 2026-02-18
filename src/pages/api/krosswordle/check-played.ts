import type { APIRoute } from "astro";
import { supabase } from "@/db/supabase";
import { getUserFromCookies } from "@/utils/auth";

export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    const user = await getUserFromCookies(cookies, () => null);

    if (!user) {
      return new Response(JSON.stringify({ status: "new" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const playDate =
      url.searchParams.get("date") || new Date().toISOString().split("T")[0];

    // Əvvəlcə session cədvəlindən yoxla
    const { data: session } = await supabase
      .from("krosswordle_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("play_date", playDate)
      .single();

    if (session) {
      if (session.status === "completed") {
        return new Response(
          JSON.stringify({
            status: "completed",
            score: {
              completionTime: session.elapsed_seconds,
              levelId: session.level_id,
              playDate: session.play_date,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      // Davam edən oyun
      return new Response(
        JSON.stringify({
          status: "playing",
          session: {
            gridState: session.grid_state,
            powersState: session.powers_state,
            elapsedSeconds: session.elapsed_seconds,
            levelId: session.level_id,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // Session yoxdursa, köhnə scores cədvəlindən yoxla (geriyə uyğunluq)
    const { data: scoreData } = await supabase
      .from("krosswordle_scores")
      .select("*")
      .eq("user_id", user.id)
      .eq("play_date", playDate)
      .single();

    if (scoreData) {
      return new Response(
        JSON.stringify({
          status: "completed",
          score: {
            completionTime: scoreData.completion_time,
            levelId: scoreData.level_id,
            playDate: scoreData.play_date,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // Yeni oyun
    return new Response(JSON.stringify({ status: "new" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("API xətası:", error);
    return new Response(JSON.stringify({ status: "new" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};
