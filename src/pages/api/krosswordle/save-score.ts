import type { APIRoute } from "astro";
import { supabase } from "@/db/supabase";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const accessToken = cookies.get("sb-access-token")?.value;

    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Giriş tələb olunur" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "İstifadəçi tapılmadı" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { levelId, completionTime, playDate } = await request.json();

    if (!levelId || !completionTime || !playDate) {
      return new Response(JSON.stringify({ error: "Məlumat əskikdir" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

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
