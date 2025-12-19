import type { APIRoute } from "astro";
import { requireAdmin } from "@/utils/auth";
import { supabase, supabaseAdmin } from "@/db/supabase";

export const POST: APIRoute = async (context) => {
  try {
    // Admin yoxlaması
    const adminCheck = await requireAdmin(context);
    if (adminCheck instanceof Response) {
      return adminCheck;
    }

    const { userId, fullname, email, username, role_id } =
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
    if (role_id !== undefined) updateData.role_id = Number(role_id);

    console.log("Update data:", updateData, "userId:", userId);

    // Əvvəlcə istifadəçinin mövcudluğunu yoxla
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();

    console.log("Existing user:", existingUser);

    if (!existingUser) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Bu ID ilə istifadəçi tapılmadı",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // İstifadəçini yenilə - supabase istifadə et (RLS ilə)
    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", userId)
      .select();

    if (error) {
      console.error("Supabase update error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: "İstifadəçi yenilənərkən xəta baş verdi: " + error.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "İstifadəçi tapılmadı və ya yenilənmədi",
        }),
        {
          status: 404,
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
