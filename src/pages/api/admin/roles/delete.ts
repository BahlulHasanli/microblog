import type { APIRoute } from "astro";
import { supabase } from "@/db/supabase";

export const POST: APIRoute = async (context) => {
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

    const body = await context.request.json();
    const { id } = body;

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, message: "Rol ID tələb olunur" }),
        { status: 400 }
      );
    }

    // Prevent deletion of default role
    const { data: roleData } = await supabase
      .from("roles")
      .select("name")
      .eq("id", id)
      .single();

    if (roleData?.name === "Sadə istifadəçi") {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Standart rol silinə bilməz",
        }),
        { status: 400 }
      );
    }

    // Delete role
    const { error } = await supabase.from("roles").delete().eq("id", id);

    if (error) {
      console.error("Rol silinərkən xəta:", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Rol silinərkən xəta baş verdi",
        }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Rol uğurla silindi" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("API xətası:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Daxili server xətası" }),
      { status: 500 }
    );
  }
};
