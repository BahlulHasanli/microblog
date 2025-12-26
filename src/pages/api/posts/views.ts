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
        { status: 200, headers: { "Content-Type": "application/json" } }
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
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      console.error("Baxış əlavə edilərkən xəta:", insertError);
      return new Response(
        JSON.stringify({ error: "Baxış əlavə edilə bilmədi" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
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
      { status: 200, headers: { "Content-Type": "application/json" } }
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
export const GET: APIRoute = async ({ url }) => {
  try {
    const postId = url.searchParams.get("postId");

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
        { status: 500, headers: { "Content-Type": "application/json" } }
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
