import type { APIRoute } from "astro";
import { requireModerator } from "@/utils/auth";
import { supabaseAdmin } from "@/db/supabase";
import { deletePostBySlug } from "@/lib/delete-post-backend";

export const POST: APIRoute = async (context) => {
  try {
    const modCheck = await requireModerator(context);
    if (modCheck instanceof Response) {
      return modCheck;
    }

    const body = await context.request.json();
    const postId = body.postId as number | string | undefined;
    const slugParam = body.slug as string | undefined;

    let slug = typeof slugParam === "string" ? slugParam.trim() : "";

    if (!slug && postId != null && postId !== "") {
      const numericId =
        typeof postId === "number" ? postId : parseInt(String(postId), 10);
      if (!Number.isNaN(numericId)) {
        const { data: row } = await supabaseAdmin
          .from("posts")
          .select("slug")
          .eq("id", numericId)
          .single();
        slug = row?.slug ?? "";
      }
    }

    if (!slug) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Post ID və ya slug tələb olunur",
        }),
        {
          status: 400,
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
        message: "Post uğurla silindi",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Post silmə xətası:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Xəta baş verdi",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
