import type { APIRoute } from "astro";
import { supabase, supabaseAdmin } from "@/db/supabase";

export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  // Xəta varsa
  if (error) {
    console.error("OAuth callback error:", error, errorDescription);
    return redirect(
      `/signin?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  // Code yoxdursa
  if (!code) {
    return redirect("/signin?error=no_code");
  }

  try {
    // Code ilə session al
    const { data: sessionData, error: sessionError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (sessionError || !sessionData.session) {
      console.error("Session exchange error:", sessionError);
      return redirect(
        `/signin?error=${encodeURIComponent(sessionError?.message || "session_error")}`
      );
    }

    const { session, user } = sessionData;

    // İstifadəçinin users cədvəlində olub-olmadığını yoxla
    const { data: existingUser, error: userCheckError } = await supabase
      .from("users")
      .select("*")
      .eq("email", user.email)
      .single();

    // İstifadəçi yoxdursa, yarat
    if (!existingUser && user.email) {
      const fullName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email.split("@")[0];
      const avatar =
        user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

      // Username generate et
      const baseUsername = fullName
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[^a-z0-9]/g, "");
      let username = baseUsername;
      let counter = 1;

      // Unique username tap
      while (true) {
        const { data: existingUsername } = await supabase
          .from("users")
          .select("username")
          .eq("username", username)
          .single();

        if (!existingUsername) break;
        username = `${baseUsername}${counter}`;
        counter++;
      }

      const { error: insertError } = await supabaseAdmin.from("users").insert({
        id: user.id,
        email: user.email,
        fullname: fullName,
        avatar: avatar,
        username: username,
      });

      if (insertError) {
        console.error("User insert error:", insertError);
        // Insert xətası olsa belə davam et, çünki auth uğurludur
      }
    }

    // Cookie-ləri qur
    const { access_token, refresh_token } = session;

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

    // Ana səhifəyə yönləndir
    return redirect("/");
  } catch (err) {
    console.error("Callback error:", err);
    return redirect("/signin?error=callback_failed");
  }
};
