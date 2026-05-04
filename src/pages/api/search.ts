import type { APIRoute } from "astro";
import { supabase } from "@/db/supabase";

export const GET: APIRoute = async (context) => {
  try {
    const url = new URL(context.request.url);
    const query = url.searchParams.get("q")?.trim() || "";
    const type = url.searchParams.get("type") || "all"; // all | posts | users | shares
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "10"), 50);

    if (!query || query.length < 2) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Axtarış sorğusu minimum 2 simvol olmalıdır.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const searchPattern = `%${query}%`;

    const results: {
      posts: any[];
      users: any[];
      shares: any[];
    } = {
      posts: [],
      users: [],
      shares: [],
    };

    // Postları axtar
    if (type === "all" || type === "posts") {
      const { data: posts, error: postsError } = await supabase
        .from("posts")
        .select(
          `
          id,
          title,
          slug,
          description,
          pub_date,
          image_url,
          image_blurhash,
          categories,
          users:author_id (
            fullname,
            avatar,
            username
          )
        `
        )
        .eq("approved", true)
        .eq("is_draft", false)
        .or(`title.ilike.${searchPattern},description.ilike.${searchPattern}`)
        .order("pub_date", { ascending: false })
        .limit(limit);

      if (postsError) {
        console.error("Posts axtarış xətası:", postsError);
      }

      results.posts = (posts || []).map((post: any) => ({
        id: post.id,
        type: "post",
        title: post.title,
        slug: post.slug,
        description: post.description,
        image: post.image_url || "",
        blurhash: post.image_blurhash || null,
        categories: post.categories,
        date: post.pub_date,
        author: post.users
          ? {
              fullname: post.users.fullname,
              avatar: post.users.avatar,
              username: post.users.username,
            }
          : null,
      }));
    }

    // İstifadəçiləri axtar
    if (type === "all" || type === "users") {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, fullname, username, avatar")
        .or(
          `fullname.ilike.${searchPattern},username.ilike.${searchPattern}`
        )
        .limit(limit);

      if (usersError) {
        console.error("Users axtarış xətası:", usersError);
      }

      results.users = (users || []).map((user: any) => ({
        id: user.id,
        type: "user",
        fullname: user.fullname,
        username: user.username,
        avatar: user.avatar,
      }));
    }

    // Paylaşımları axtar (Shares)
    if (type === "all" || type === "shares") {
      const { data: shares, error: sharesError } = await supabase
        .from("shares")
        .select(
          `
          id,
          content,
          created_at,
          users:user_id (
            fullname,
            avatar,
            username
          )
        `
        )
        .ilike("content", searchPattern)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (sharesError) {
        console.error("Shares axtarış xətası:", sharesError);
      }

      results.shares = (shares || []).map((share: any) => ({
        id: share.id,
        type: "share",
        content:
          share.content?.length > 200
            ? share.content.substring(0, 200) + "..."
            : share.content,
        date: share.created_at,
        author: share.users
          ? {
              fullname: share.users.fullname,
              avatar: share.users.avatar,
              username: share.users.username,
            }
          : null,
      }));
    }

    const totalCount =
      results.posts.length + results.users.length + results.shares.length;

    return new Response(
      JSON.stringify({
        success: true,
        query,
        totalCount,
        results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Axtarış xətası:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Axtarış zamanı xəta baş verdi",
        error: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
