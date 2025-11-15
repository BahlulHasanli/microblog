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

    const body = await context.request.json();

    // Hər bir nizamlamanı yenilə
    for (const [key, value] of Object.entries(body)) {
      const stringValue =
        typeof value === "string" ? value : JSON.stringify(value);

      // Upsert əməliyyatı
      const { error } = await supabaseAdmin.from("settings").upsert(
        {
          key,
          value: stringValue,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "key",
        }
      );

      if (error) {
        console.error(`Setting ${key} update error:`, error);
        return new Response(
          JSON.stringify({
            success: false,
            message: `${key} nizamlaması yenilənərkən xəta baş verdi`,
          }),
          { status: 500 }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Nizamlamalar uğurla yeniləndi",
      }),
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Settings update error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Xəta baş verdi",
      }),
      { status: 500 }
    );
  }
};
