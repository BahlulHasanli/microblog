import type { APIRoute } from "astro";
import { supabase } from "@/db/supabase";

export const GET: APIRoute = async (context) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, message: "Unauthorized" }),
        { status: 401 }
      );
    }

    // Check if user is admin (role_id = 1)
    const { data: userData } = await supabase
      .from("users")
      .select("role_id")
      .eq("id", user.id)
      .single();

    if (userData?.role_id !== 1) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Admin hüququ tələb olunur",
        }),
        { status: 403 }
      );
    }

    // Get all roles
    const { data: roles, error } = await supabase
      .from("roles")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Rollər yüklənərkən xəta:", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Rollər yüklənərkən xəta baş verdi",
        }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify({ success: true, roles }), {
      status: 200,
    });
  } catch (error) {
    console.error("API xətası:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Daxili server xətası" }),
      { status: 500 }
    );
  }
};
