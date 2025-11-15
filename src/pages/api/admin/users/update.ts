import type { APIRoute } from "astro";
import { requireAdmin } from "@/utils/auth";
import { supabaseAdmin } from "@/db/supabase";

export const POST: APIRoute = async (context) => {
  try {
    // Admin yoxlaması
    const adminCheck = await requireAdmin(context);
    if (adminCheck instanceof Response) {
      return adminCheck;
    }

    const { userId, fullname, email, username, is_admin } =
      await context.request.json();

    if (!userId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "İstifadəçi ID tələb olunur",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Yeniləmə məlumatlarını hazırla
    const updateData: any = {};
    if (fullname !== undefined) updateData.fullname = fullname;
    if (email !== undefined) updateData.email = email;
    if (username !== undefined) updateData.username = username;
    if (is_admin !== undefined) updateData.is_admin = is_admin;

    // İstifadəçini yenilə
    const { error } = await supabaseAdmin
      .from("users")
      .update(updateData)
      .eq("id", userId);

    if (error) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "İstifadəçi yenilənərkən xəta baş verdi",
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
        message: "İstifadəçi uğurla yeniləndi",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("İstifadəçi yeniləmə xətası:", error);
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
