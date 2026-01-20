export const prerender = false;
import type { APIRoute } from "astro";
import { supabase, supabaseAdmin } from "@db/supabase";

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
      const { data: existingUser, error: selectError } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", user.email)
        .single();

      if (selectError && selectError.code !== "PGRST116") {
        console.error("Error checking user in set-session:", selectError);
      }

      if (!existingUser) {
        // Yeni istifadəçi yarat
        const username =
          user.email.split("@")[0] +
          "_" +
          Math.random().toString(36).substring(2, 6);

        const { error: insertError } = await supabaseAdmin
          .from("users")
          .insert({
            id: user.id,
            email: user.email,
            username: username,
            fullname:
              user.user_metadata?.full_name || user.user_metadata?.name || "",
            avatar:
              user.user_metadata?.avatar_url ||
              user.user_metadata?.picture ||
              null,
            role_id: 4,
          });

        if (insertError) {
          console.error("Error creating user in set-session:", insertError);
        } else {
          console.log("User created successfully via set-session:", username);
        }
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
