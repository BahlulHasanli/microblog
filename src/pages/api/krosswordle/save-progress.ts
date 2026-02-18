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

    const { gridState, powersState, elapsed } = await request.json();
    const today = new Date().toISOString().split("T")[0];

    // Yalnız aktiv session-u yenilə
    const { error } = await supabase
      .from("krosswordle_sessions")
      .update({
        grid_state: gridState,
        powers_state: powersState,
        elapsed_seconds: elapsed,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("play_date", today)
      .eq("status", "playing");

    if (error) {
      console.error("Progress saxlanarkən xəta:", error);
      return new Response(JSON.stringify({ error: "Progress saxlanmadı" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
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
