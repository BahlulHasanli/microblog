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

    // Form verilerini al
    const { shareId, imageUrls, imageBlurhashes } =
      await context.request.json();

    if (!shareId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Paylaşım ID-si yoxdur",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Supabase-də şəkilləri yenilə
    const updateData: {
      image_urls: string[];
      image_blurhashes?: (string | null)[];
    } = {
      image_urls: imageUrls,
    };

    if (imageBlurhashes && Array.isArray(imageBlurhashes)) {
      updateData.image_blurhashes = imageBlurhashes;
    }

    const { data, error } = await supabaseAdmin
      .from("shares")
      .update(updateData)
      .eq("id", shareId)
      .select();

    if (error) {
      console.error("Supabase update xətası:", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Şəkillər yenilənərkən xəta: " + error.message,
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
        message: "Şəkillər uğurla yeniləndi",
        data,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Şəkillər yenilənməsi xətası:", error);
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
