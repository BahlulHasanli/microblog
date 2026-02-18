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

    const { levelId, gridState, powersState } = await request.json();
    const today = new Date().toISOString().split("T")[0];

    // Mövcud session yoxla
    const { data: existing } = await supabase
      .from("krosswordle_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("play_date", today)
      .single();

    if (existing) {
      if (existing.status === "completed") {
        return new Response(
          JSON.stringify({ error: "Bu gün artıq oynayıbsınız" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      // Mövcud session-u qaytar
      return new Response(JSON.stringify({ session: existing }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Yeni session yarat
    const { data, error } = await supabase
      .from("krosswordle_sessions")
      .insert({
        user_id: user.id,
        play_date: today,
        level_id: levelId,
        grid_state: gridState,
        powers_state: powersState,
        elapsed_seconds: 0,
        status: "playing",
      })
      .select()
      .single();

    if (error) {
      console.error("Session yaradılarkən xəta:", error);
      return new Response(JSON.stringify({ error: "Session yaradılmadı" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ session: data }), {
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
