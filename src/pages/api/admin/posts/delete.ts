import type { APIRoute } from "astro";
import { requireModerator } from "@/utils/auth";
import { supabaseAdmin } from "@/db/supabase";

export const POST: APIRoute = async (context) => {
  try {
    // Moderator yoxlaması (admin və moderator)
    const modCheck = await requireModerator(context);
    if (modCheck instanceof Response) {
      return modCheck;
    }

    const { postId, slug } = await context.request.json();

    if (!postId && !slug) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Post ID və ya slug tələb olunur",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const postSlug = slug || postId;

    // Supabase-dən postu sil
    const { error: deleteError } = await supabaseAdmin
      .from("posts")
      .delete()
      .eq("slug", postSlug);

    if (deleteError) {
      console.error("Supabase delete xətası:", deleteError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Post silinə bilmədi",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // BunnyCDN-dən şəkilləri sil
    try {
      const bunnyApiKey = "a3571a42-cb98-4dce-9b81d75e2c8c-5263-4043";
      const storageZoneName = "the99-storage";
      const hostname = "storage.bunnycdn.com";
      const folder = `posts/${postSlug}`;

      const response = await fetch(
        `https://${hostname}/${storageZoneName}/${folder}/`,
        {
          method: "DELETE",
          headers: {
            AccessKey: bunnyApiKey,
          },
        }
      );

      if (response.ok) {
        console.log(`BunnyCDN klasörü silindi: ${folder}`);
      }
    } catch (cdnError) {
      console.error("BunnyCDN silmə xətası:", cdnError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Post uğurla silindi",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
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
      }
    );
  }
};
