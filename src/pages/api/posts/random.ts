import type { APIRoute } from "astro";
import { supabase } from "@/db/supabase";

export const GET: APIRoute = async () => {
  try {
    const { data: posts, error } = await supabase
      .from("posts")
      .select("slug")
      .eq("approved", true)
      .order("pub_date", { ascending: false });

    if (error || !posts || posts.length === 0) {
      return new Response(JSON.stringify({ error: "Məqalə tapılmadı" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const randomPost = posts[Math.floor(Math.random() * posts.length)];

    return new Response(JSON.stringify({ slug: randomPost.slug }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Random məqalə API xətası:", error);
    return new Response(JSON.stringify({ error: "Server xətası" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
