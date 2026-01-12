export const prerender = false;
import type { APIRoute } from "astro";
import { supabase } from "@db/supabase";

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const authCode = url.searchParams.get("code");

  if (!authCode) {
    return redirect("/signin?error=no_code");
  }

  try {
    const { data, error } =
      await supabase.auth.exchangeCodeForSession(authCode);

    if (error) {
      console.error("OAuth callback error:", error.message);
      return redirect("/signin?error=auth_failed");
    }

    const { access_token, refresh_token } = data.session;

    // Cookie-ləri qur
    cookies.set("sb-access-token", access_token, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 gün
    });
    cookies.set("sb-refresh-token", refresh_token, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 gün
    });

    // İstifadəçini verilənlər bazasında yoxla/yarat
    const user = data.user;
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

    return redirect("/");
  } catch (error) {
    console.error("Callback error:", error);
    return redirect("/signin?error=callback_failed");
  }
};
