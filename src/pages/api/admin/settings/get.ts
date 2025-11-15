import type { APIRoute } from "astro";
import { requireAdmin } from "@/utils/auth";
import { supabase } from "@/db/supabase";

export const GET: APIRoute = async (context) => {
  try {
    // Admin yoxlaması
    const adminCheck = await requireAdmin(context);
    if (adminCheck instanceof Response) {
      return adminCheck;
    }

    // Bütün nizamlamaları al
    const { data: settings, error } = await supabase
      .from("settings")
      .select("*")
      .order("key", { ascending: true });

    if (error) {
      console.error("Settings get error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Nizamlamalar yüklənərkən xəta baş verdi",
        }),
        { status: 500 }
      );
    }

    // Key-value obyektinə çevir
    const settingsObj: any = {};
    for (const setting of settings || []) {
      try {
        settingsObj[setting.key] =
          setting.type === "boolean"
            ? setting.value === "true"
            : setting.type === "number"
              ? parseFloat(setting.value)
              : setting.type === "json"
                ? JSON.parse(setting.value)
                : setting.value;
      } catch {
        settingsObj[setting.key] = setting.value;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        settings: settingsObj,
      }),
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Settings get error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Xəta baş verdi",
      }),
      { status: 500 }
    );
  }
};
