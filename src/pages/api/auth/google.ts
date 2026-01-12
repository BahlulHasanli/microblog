export const prerender = false;
import type { APIRoute } from "astro";
import { supabase } from "@db/supabase";

export const POST: APIRoute = async ({ request, url }) => {
  try {
    // Redirect URL-i təyin et
    const redirectTo = `${url.origin}/api/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: data.url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    return new Response(JSON.stringify({ error: "Google ilə giriş xətası" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
