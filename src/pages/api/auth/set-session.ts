export const prerender = false;
import type { APIRoute } from "astro";
import { supabase } from "@db/supabase";

export const POST: APIRoute = async ({ request, cookies, url }) => {
  try {
    const { access_token, refresh_token } = await request.json();

    if (!access_token || !refresh_token) {
      return new Response(JSON.stringify({ error: "Token-lər tələb olunur" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Cookie-ləri qur - production-da secure: true, development-də false
    const isProduction =
      url.hostname !== "localhost" && !url.hostname.includes("127.0.0.1");

    cookies.set("sb-access-token", access_token, {
      path: "/",
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 gün
    });
    cookies.set("sb-refresh-token", refresh_token, {
      path: "/",
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 gün
    });

    // İstifadəçini verilənlər bazasında yoxla/yarat
    const { data: sessionData } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    const user = sessionData?.user;
    if (user?.email) {
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", user.email)
        .single();

      if (!existingUser) {
        // Yeni istifadəçi yarat
        const username =
          user.email.split("@")[0] +
          "_" +
          Math.random().toString(36).substring(2, 6);

        await supabase.from("users").insert({
          email: user.email,
          username: username,
          full_name:
            user.user_metadata?.full_name || user.user_metadata?.name || "",
          avatar_url:
            user.user_metadata?.avatar_url ||
            user.user_metadata?.picture ||
            null,
          role_id: 4, // Default user role
          is_active: true,
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Set session error:", error);
    return new Response(JSON.stringify({ error: "Session qurma xətası" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
