export const prerender = false;
import type { APIRoute } from "astro";
import { supabase, supabaseAdmin } from "@db/supabase";

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const authCode = url.searchParams.get("code");

  console.log("Callback received, code:", authCode ? "exists" : "missing");

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

    console.log("Session exchanged successfully, user:", data.user?.email);

    const { access_token, refresh_token } = data.session;

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

    console.log("Cookies set, isProduction:", isProduction);

    // İstifadəçini verilənlər bazasında yoxla/yarat
    const user = data.user;
    if (user?.email) {
      const { data: existingUser, error: selectError } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", user.email)
        .single();

      if (selectError && selectError.code !== "PGRST116") {
        console.error("Error checking user:", selectError);
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
          console.error("Error creating user in callback:", insertError);
        } else {
          console.log("User created successfully via callback:", username);
        }
      } else {
        console.log("User already exists:", user.email);
      }
    }

    return redirect("/");
  } catch (error) {
    console.error("Callback error:", error);
    return redirect("/signin?error=callback_failed");
  }
};
