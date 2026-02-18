import type { APIRoute } from "astro";
import { supabase, supabaseAdmin } from "@/db/supabase";
import { getUserFromCookies } from "@/utils/auth";

// GET — level-ləri gətir
// ?date=2026-02-17 → bugünkü level (oyun üçün)
// ?month=2026-02&admin=true → ayın bütün level-ləri (admin üçün)
// ?admin=true → bütün level-lər (admin)
export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    const isAdmin = url.searchParams.get("admin") === "true";
    const date = url.searchParams.get("date");
    const month = url.searchParams.get("month");

    if (date) {
      // Konkret tarix üçün level (oyun üçün)
      const { data, error } = await supabase
        .from("krosswordle_levels")
        .select("*")
        .eq("play_date", date)
        .eq("is_active", true)
        .single();

      if (error || !data) {
        return new Response(JSON.stringify({ level: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ level: data }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (isAdmin) {
      const user = await getUserFromCookies(cookies, () => null);
      if (!user || user.role_id !== 1) {
        return new Response(
          JSON.stringify({ error: "Admin hüququ tələb olunur" }),
          { status: 403, headers: { "Content-Type": "application/json" } },
        );
      }

      if (month) {
        // Ayın level-ləri: month=2026-02
        const startDate = `${month}-01`;
        const [yearStr, monthStr] = month.split("-");
        const year = parseInt(yearStr);
        const mon = parseInt(monthStr);
        const lastDay = new Date(year, mon, 0).getDate();
        const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;

        const { data, error } = await supabaseAdmin
          .from("krosswordle_levels")
          .select("*")
          .gte("play_date", startDate)
          .lte("play_date", endDate)
          .order("play_date", { ascending: true });

        if (error) {
          console.error("Levels yüklənərkən xəta:", error);
          return new Response(JSON.stringify({ error: "Levels yüklənmədi" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ levels: data || [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Bütün level-lər
      const { data, error } = await supabaseAdmin
        .from("krosswordle_levels")
        .select("*")
        .order("play_date", { ascending: true });

      if (error) {
        return new Response(JSON.stringify({ error: "Levels yüklənmədi" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ levels: data || [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Oyun üçün — yalnız aktiv level-ləri gətir
    const { data, error } = await supabase
      .from("krosswordle_levels")
      .select("*")
      .eq("is_active", true)
      .order("play_date", { ascending: true });

    return new Response(JSON.stringify({ levels: data || [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("API xətası:", error);
    return new Response(JSON.stringify({ levels: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};

// POST — yeni level yarat və ya mövcudu yenilə
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await getUserFromCookies(cookies, () => null);
    if (!user || user.role_id !== 1) {
      return new Response(
        JSON.stringify({ error: "Admin hüququ tələb olunur" }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    const { id, levelNumber, words, isActive, playDate } = await request.json();

    if (!words || !Array.isArray(words) || words.length === 0) {
      return new Response(JSON.stringify({ error: "Sözlər tələb olunur" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!playDate) {
      return new Response(
        JSON.stringify({ error: "Tarix (playDate) tələb olunur" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Sözləri validasiya et
    for (const word of words) {
      if (
        !word.id ||
        !word.word ||
        word.x == null ||
        word.y == null ||
        !word.direction ||
        !word.clue
      ) {
        return new Response(
          JSON.stringify({
            error:
              "Hər sözün id, word, x, y, direction və clue sahələri olmalıdır",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      const endX =
        word.direction === "H" ? word.x + word.word.length - 1 : word.x;
      const endY =
        word.direction === "V" ? word.y + word.word.length - 1 : word.y;
      if (endX > 6 || endY > 6 || word.x < 0 || word.y < 0) {
        return new Response(
          JSON.stringify({
            error: `"${word.word}" sözü grid-dən kənara çıxır (7x7)`,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    if (id) {
      // Yenilə
      const { data, error } = await supabaseAdmin
        .from("krosswordle_levels")
        .update({
          level_number: levelNumber || 1,
          words: words,
          is_active: isActive ?? true,
          play_date: playDate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Level yenilənərkən xəta:", JSON.stringify(error));
        return new Response(
          JSON.stringify({
            error:
              "Level yenilənmədi: " +
              (error.message || error.code || JSON.stringify(error)),
          }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(JSON.stringify({ success: true, level: data }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } else {
      // Yeni yarat — əvvəlcə həmin tarixdə level olub-olmadığını yoxla
      const { data: existing } = await supabaseAdmin
        .from("krosswordle_levels")
        .select("id")
        .eq("play_date", playDate)
        .single();

      if (existing) {
        // Mövcud olanı yenilə
        const { data, error } = await supabaseAdmin
          .from("krosswordle_levels")
          .update({
            level_number: levelNumber || 1,
            words: words,
            is_active: isActive ?? true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) {
          console.error("Level yenilənərkən xəta:", JSON.stringify(error));
          return new Response(
            JSON.stringify({
              error:
                "Level yenilənmədi: " +
                (error.message || error.code || JSON.stringify(error)),
            }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(JSON.stringify({ success: true, level: data }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Yeni yarat
      const { data, error } = await supabaseAdmin
        .from("krosswordle_levels")
        .insert({
          level_number: levelNumber || 1,
          words: words,
          is_active: isActive ?? true,
          play_date: playDate,
        })
        .select()
        .single();

      if (error) {
        console.error(
          "Level yaradılarkən FULL xəta:",
          JSON.stringify(error, null, 2),
        );
        return new Response(
          JSON.stringify({
            error:
              "Level yaradılmadı: " +
              (error.message || error.code || JSON.stringify(error)),
          }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(JSON.stringify({ success: true, level: data }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("API xətası:", error);
    return new Response(JSON.stringify({ error: "Server xətası" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

// DELETE — level-i sil
export const DELETE: APIRoute = async ({ request, cookies }) => {
  try {
    const user = await getUserFromCookies(cookies, () => null);
    if (!user || user.role_id !== 1) {
      return new Response(
        JSON.stringify({ error: "Admin hüququ tələb olunur" }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    const { id } = await request.json();

    if (!id) {
      return new Response(JSON.stringify({ error: "Level ID tələb olunur" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { error } = await supabaseAdmin
      .from("krosswordle_levels")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Level silinərkən xəta:", error);
      return new Response(JSON.stringify({ error: "Level silinmədi" }), {
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
