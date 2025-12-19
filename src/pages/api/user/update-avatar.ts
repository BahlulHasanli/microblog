import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../db/supabase";
import { getUserFromCookies } from "@/utils/auth";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // getUserFromCookies ilə istifadəçini al
    const user = await getUserFromCookies(cookies, () => null);

    if (!user) {
      return new Response(JSON.stringify({ error: "İcazəsiz giriş" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    const body = await request.json();
    const { avatarUrl } = body;

    if (!avatarUrl) {
      return new Response(
        JSON.stringify({ error: "Avatar URL tələb olunur" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Avatar update başlayır:", { userId, avatarUrl });

    // Supabase admin client ilə update et
    const { data, error } = await supabaseAdmin
      .from("users")
      .update({ avatar: avatarUrl })
      .eq("id", userId)
      .select("id, avatar");

    if (error) {
      console.error("Supabase update xətası:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("Avatar uğurla yeniləndi:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Avatar update xətası:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Xəta baş verdi" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
