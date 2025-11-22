import type { APIRoute } from "astro";
import { getUserFromCookies } from "@/utils/auth";
import { supabaseAdmin } from "@/db/supabase";

export const POST: APIRoute = async (context) => {
  try {
    // Istifadəçi məlumatlarını al
    const user = await getUserFromCookies(context.cookies, () => null);

    if (!user?.email) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Daxil olmamısınız",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Form
    const { content, imageUrls, youtubeVideoId } = await context.request.json();

    if (!content || !content.trim()) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Paylaşım boş olmalı deyil",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (content.length > 500) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Paylaşım 500 simvoldan çox olmalı deyil",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Supabase admin client-i istifadə edərək insert et
    const { data, error } = await supabaseAdmin
      .from("shares")
      .insert({
        user_id: user.id,
        content: content.trim(),
        image_urls: imageUrls || null,
        youtube_video_id: youtubeVideoId || null,
      })
      .select();

    if (error) {
      console.error("Supabase insert xətası:", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Paylaşım əlavə edilərkən xəta: " + error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Paylaşım uğurla əlavə edildi!",
        data,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Paylaşım yaratma xətası:", error);
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
