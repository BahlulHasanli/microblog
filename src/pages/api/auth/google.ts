import type { APIRoute } from "astro";
import { supabase } from "@/db/supabase";

export const GET: APIRoute = async ({ request, redirect }) => {
  const origin = new URL(request.url).origin;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/api/auth/callback`,
    },
  });

  if (error) {
    console.error("Google OAuth error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (data.url) {
    return redirect(data.url);
  }

  return new Response(JSON.stringify({ error: "OAuth URL alına bilmədi" }), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
};
