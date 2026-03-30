import type { APIRoute } from "astro";
import { supabaseAdmin } from "@/db/supabase";

export const GET: APIRoute = async () => {
  try {
    const { data, error } = await supabaseAdmin
      .from("stream_video_category")
      .select("id, name, slug, sort_order")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[stream-video/categories]", error);
      return new Response(JSON.stringify({ success: false, message: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, categories: data ?? [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[stream-video/categories]", e);
    return new Response(JSON.stringify({ success: false, message: "Server xətası" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
