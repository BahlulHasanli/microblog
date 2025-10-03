import type { APIRoute } from "astro";
import { requireAdmin } from "@/utils/auth";
import { getCollection } from "astro:content";

export const GET: APIRoute = async (context) => {
  try {
    console.log("Admin posts list API çağırıldı");
    
    // Admin yoxlaması
    const adminCheck = await requireAdmin(context);
    if (adminCheck instanceof Response) {
      console.log("Admin yoxlaması uğursuz");
      return adminCheck;
    }

    console.log("Admin yoxlaması uğurlu");

    // URL parametrlərini al
    const url = new URL(context.request.url);
    const filter = url.searchParams.get("status") || "all";
    console.log("Filter:", filter);

    // Bütün postları al
    const allPosts = await getCollection("posts");
    console.log("Bütün postlar:", allPosts.length);

    // Filtrələ
    let posts = allPosts;
    if (filter === "pending") {
      posts = allPosts.filter(post => post.data.approved === false);
    } else if (filter === "approved") {
      posts = allPosts.filter(post => post.data.approved === true);
    }

    console.log("Filtrlənmiş postlar:", posts.length);

    // Response formatına çevir
    const formattedPosts = posts.map(post => ({
      id: post.slug,
      slug: post.slug,
      title: post.data.title,
      description: post.data.description,
      author_name: post.data.author.name,
      author_avatar: post.data.author.avatar,
      status: post.data.approved ? "approved" : "pending",
      created_at: post.data.pubDate.toISOString(),
    })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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
