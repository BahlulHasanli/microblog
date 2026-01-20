import type { APIRoute } from "astro";
import { supabase } from "@/db/supabase";

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const body = await request.json();
    const { postId } = body;

    if (!postId) {
      return new Response(JSON.stringify({ error: "Post ID tələb olunur" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // IP ünvanını al
    const ip =
      clientAddress ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Əvvəlcə bu IP-nin bu postu baxıb-baxmadığını yoxla
    const { data: existingView } = await supabase
      .from("post_views")
      .select("id")
      .eq("post_id", postId)
      .eq("ip_address", ip)
      .single();

    if (existingView) {
      // Artıq baxılıb, yeni baxış əlavə etmə
      const { count } = await supabase
        .from("post_views")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);

      return new Response(
        JSON.stringify({
          success: true,
          viewCount: count || 0,
          isNewView: false,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // Yeni baxış əlavə et
    const { error: insertError } = await supabase.from("post_views").insert({
      post_id: postId,
      ip_address: ip,
    });

    if (insertError) {
      // UNIQUE constraint violation - eyni IP artıq baxıb
      if (insertError.code === "23505") {
        const { count } = await supabase
          .from("post_views")
          .select("*", { count: "exact", head: true })
          .eq("post_id", postId);

        return new Response(
          JSON.stringify({
            success: true,
            viewCount: count || 0,
            isNewView: false,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      console.error("Baxış əlavə edilərkən xəta:", insertError);
      return new Response(
        JSON.stringify({ error: "Baxış əlavə edilə bilmədi" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // Yeni baxış sayını al
    const { count } = await supabase
      .from("post_views")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    return new Response(
      JSON.stringify({
        success: true,
        viewCount: count || 0,
        isNewView: true,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Baxış API xətası:", error);
    return new Response(JSON.stringify({ error: "Server xətası" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

// Baxış sayını almaq üçün GET endpoint
// Tək post: ?postId=123
// Batch: ?postIds=123,456,789
export const GET: APIRoute = async ({ url }) => {
  try {
    const postId = url.searchParams.get("postId");
    const postIds = url.searchParams.get("postIds");

    // Batch sorğu - birdəfəyə çox post üçün
    if (postIds) {
      const ids = postIds
        .split(",")
        .map((id) => parseInt(id.trim()))
        .filter((id) => !isNaN(id));

      if (ids.length === 0) {
        return new Response(
          JSON.stringify({ error: "Düzgün post ID-ləri tələb olunur" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Bütün post-lar üçün view count-ları bir sorğu ilə al
      const { data, error } = await supabase
        .from("post_views")
        .select("post_id")
        .in("post_id", ids);

      if (error) {
        console.error("Batch baxış sayı alınarkən xəta:", error);
        return new Response(
          JSON.stringify({ error: "Baxış sayları alına bilmədi" }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }

      // Post ID-lərə görə qruplaşdır
      const viewCounts: Record<number, number> = {};
      ids.forEach((id) => {
        viewCounts[id] = 0;
      });

      if (data) {
        data.forEach((row) => {
          viewCounts[row.post_id] = (viewCounts[row.post_id] || 0) + 1;
        });
      }

      return new Response(JSON.stringify({ viewCounts }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Tək post sorğusu
    if (!postId) {
      return new Response(JSON.stringify({ error: "Post ID tələb olunur" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { count, error } = await supabase
      .from("post_views")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    if (error) {
      console.error("Baxış sayı alınarkən xəta:", error);
      return new Response(
        JSON.stringify({ error: "Baxış sayı alına bilmədi" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ viewCount: count || 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Baxış GET API xətası:", error);
    return new Response(JSON.stringify({ error: "Server xətası" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
