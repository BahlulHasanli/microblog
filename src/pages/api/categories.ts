import type { APIRoute } from "astro";
import { supabase } from "@/db/supabase";

export const GET: APIRoute = async () => {
  try {
    const { data: categories, error } = await supabase
      .from("categories")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Kategoriyalar çəkilərkən xəta:", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Kategoriyalar çəkilə bilmədi",
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
        categories: categories || [],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Kategoriyalar API xətası:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Kategoriyalar çəkilərkən xəta baş verdi",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
