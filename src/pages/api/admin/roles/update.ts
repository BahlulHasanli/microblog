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
    const { id, name, description } = body;

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, message: "Rol ID tələb olunur" }),
        { status: 400 }
      );
    }

    // Update role (only name and description can be updated)
    const { data: updatedRole, error } = await supabase
      .from("roles")
      .update({
        name,
        description,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Rol yenilənərkən xəta:", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Rol yenilənərkən xəta baş verdi",
        }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify({ success: true, role: updatedRole }), {
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
