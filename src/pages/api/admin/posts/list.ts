import type { APIRoute } from "astro";
import { requireModerator } from "@/utils/auth";
import { supabase } from "@/db/supabase";

export const GET: APIRoute = async (context) => {
  try {
    console.log("Admin posts list API çağırıldı");

    // Moderator yoxlaması (admin və moderator)
    const modCheck = await requireModerator(context);
    if (modCheck instanceof Response) {
      console.log("Moderator yoxlaması uğursuz");
      return modCheck;
    }

    console.log("Admin yoxlaması uğurlu");

    // URL parametrlərini al
    const url = new URL(context.request.url);
    const filter = url.searchParams.get("status") || "all";
    console.log("Filter:", filter);

    // Supabase-dən postları al (users cədvəli ilə birləşdir)
    let query = supabase
      .from("posts")
      .select(
        `
        *,
        users:author_email (
          fullname,
          avatar
        )
      `
      )
      .order("pub_date", { ascending: false });

    // Filtrələ
    if (filter === "pending") {
      query = query.eq("approved", false);
    } else if (filter === "approved") {
      query = query.eq("approved", true);
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error("Supabase xətası:", error);
      throw error;
    }

    console.log("Postlar alındı:", posts?.length || 0);

    // Response formatına çevir
    const formattedPosts = (posts || []).map((post: any) => ({
      id: post.id,
      slug: post.slug,
      title: post.title,
      description: post.description,
      author_name: post.users?.fullname || "Bilinməyən",
      author_avatar: post.users?.avatar || "",
      status: post.approved ? "approved" : "pending",
      featured: post.featured || false,
      created_at: new Date(post.pub_date).toISOString(),
    }));

    console.log("Response göndərilir:", formattedPosts.length, "post");

    return new Response(
      JSON.stringify({
        success: true,
        posts: formattedPosts,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Post siyahısı xətası:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Xəta baş verdi",
        error: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
