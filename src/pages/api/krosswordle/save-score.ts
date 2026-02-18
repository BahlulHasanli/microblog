import type { APIRoute } from "astro";
import { supabase } from "@/db/supabase";
import { getUserFromCookies } from "@/utils/auth";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await getUserFromCookies(cookies, () => null);

    if (!user) {
      return new Response(JSON.stringify({ error: "Giriş tələb olunur" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { levelId, completionTime, playDate } = await request.json();

    if (!levelId || completionTime == null || !playDate) {
      return new Response(JSON.stringify({ error: "Məlumat əskikdir" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Server-side validasiya
    const today = new Date().toISOString().split("T")[0];
    if (playDate !== today) {
      return new Response(
        JSON.stringify({ error: "Yalnız bugünkü tarix qəbul olunur" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (
      typeof completionTime !== "number" ||
      completionTime < 0 ||
      !Number.isInteger(completionTime)
    ) {
      return new Response(JSON.stringify({ error: "Düzgün olmayan vaxt" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (typeof levelId !== "number" || levelId < 1) {
      return new Response(JSON.stringify({ error: "Düzgün olmayan səviyyə" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Score-u saxla (leaderboard üçün)
    const { data, error } = await supabase
      .from("krosswordle_scores")
      .upsert(
        {
          user_id: user.id,
          level_id: levelId,
          play_date: playDate,
          completion_time: completionTime,
        },
        {
          onConflict: "user_id,play_date",
        },
      )
      .select()
      .single();

    if (error) {
      console.error("Score saxlanarkən xəta:", error);
      return new Response(JSON.stringify({ error: "Score saxlanmadı" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Session-u 'completed' olaraq yenilə
    await supabase
      .from("krosswordle_sessions")
      .update({
        status: "completed",
        elapsed_seconds: completionTime,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("play_date", today);

    return new Response(JSON.stringify({ success: true, data }), {
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
