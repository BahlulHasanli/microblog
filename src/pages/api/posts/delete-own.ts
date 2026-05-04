import type { APIRoute } from "astro";
import { requireAuth } from "@/utils/auth";
import { supabaseAdmin } from "@/db/supabase";
import { deletePostBySlug } from "@/lib/delete-post-backend";

export const POST: APIRoute = async (context) => {
  try {
    const user = await requireAuth(context);
    if (user instanceof Response) {
      return user;
    }

    let slug = "";
    try {
      const body = await context.request.json();
      slug = typeof body?.slug === "string" ? body.slug.trim() : "";
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Slug tələb olunur",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (!slug) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Slug tələb olunur",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const { data: post, error: fetchErr } = await supabaseAdmin
      .from("posts")
      .select("id, author_id")
      .eq("slug", slug)
      .single();

    if (fetchErr || !post) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Post tapılmadı",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (String(post.author_id) !== String(user.id)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Bu postu silmək hüququnuz yoxdur",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const result = await deletePostBySlug(slug);
    if (!result.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          message: result.message || "Post silinə bilmədi",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Məqalə silindi",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("delete-own xətası:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Server xətası",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
