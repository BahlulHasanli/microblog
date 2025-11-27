import type { APIRoute } from "astro";
import { supabase } from "@/db/supabase";
import { requireAuth } from "@/utils/auth";

export const POST: APIRoute = async (context) => {
  try {
    // Autentifikasiya yoxla
    const user = await requireAuth(context);

    if (user instanceof Response) {
      return user;
    }

    const { shareId, content, parentId } = await context.request.json();

    // Validasiya
    if (!shareId || !content) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Share ID və content tələb olunur",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (content.trim().length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Şərh boş olmalı deyil",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (content.length > 1000) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Şərh 1000 simvoldan çox olmalı deyil",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Share mövcud olub-olmadığını yoxla
    const { data: share, error: shareError } = await supabase
      .from("shares")
      .select("id")
      .eq("id", shareId)
      .single();

    if (shareError || !share) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Paylaşım tapılmadı",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Comment əlavə et
    const { data, error } = await supabase
      .from("share_comments")
      .insert({
        share_id: shareId,
        user_id: user.id,
        content: content.trim(),
        parent_id: parentId || null,
      })
      .select("*, user_id(id, fullname, username, avatar)");

    if (error) {
      console.error("Supabase insert xətası:", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Şərh əlavə edilərkən xəta: " + error.message,
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
        message: "Şərh uğurla əlavə edildi!",
        data,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Şərh əlavə etmə xətası:", error);
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
