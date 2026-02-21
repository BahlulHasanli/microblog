import type { APIRoute } from "astro";
import { supabase } from "@/db/supabase";

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");

  // Settings-dən posts_per_page dəyərini al
  let defaultLimit = 10;
  try {
    const { data: settingData } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "posts_per_page")
      .single();

    if (settingData?.value) {
      defaultLimit = parseInt(settingData.value) || 10;
    }
  } catch (e) {
    // Default 10 istifadə et
  }

  const limit = parseInt(url.searchParams.get("limit") || String(defaultLimit));
  const offset = (page - 1) * limit;

  try {
    // Ümumi post sayını al
    const { count, error: countError } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("approved", true);

    if (countError) {
      return new Response(
        JSON.stringify({ error: "Post sayı alınarkən xəta" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Postları al
    const { data: postsData, error: postsError } = await supabase
      .from("posts")
      .select(
        `
        *,
        users:author_id (avatar, fullname, username)
      `
      )
      .eq("approved", true)
      .order("pub_date", { ascending: false })
      .range(offset, offset + limit - 1);

    if (postsError) {
      return new Response(
        JSON.stringify({ error: "Postlar yüklənərkən xəta" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Postları formatla
    const posts = (postsData || []).map((post) => ({
      slug: post.slug,
      id: post.id,
      data: {
        title: post.title,
        description: post.description,
        pubDate: post.pub_date,
        image: {
          url: post.image_url || "",
          alt: post.image_alt || post.title,
        },
        blurhash: post.image_blurhash || null,
        categories: post.categories,
        approved: post.approved,
        featured: post.featured,
        author: post.users,
        hasAudio: post.content ? post.content.includes('<audio') : false,
      },
    }));

    const totalPages = Math.ceil((count || 0) / limit);
    const hasMore = page < totalPages;

    return new Response(
      JSON.stringify({
        posts,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages,
          hasMore,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("API xətası:", error);
    return new Response(JSON.stringify({ error: "Server xətası" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
