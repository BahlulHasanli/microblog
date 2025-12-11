import type { APIRoute } from "astro";
import { supabase } from "@/db/supabase";
import { getUserFromCookies } from "@/utils/auth";

// GET - Get permissions for current user based on their role
export const GET: APIRoute = async ({ cookies }) => {
  try {
    const user = await getUserFromCookies(cookies, null);

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, message: "Giriş tələb olunur" }),
        { status: 401 }
      );
    }

    const roleId = user.role_id;

    if (!roleId) {
      return new Response(JSON.stringify({ success: true, permissions: [] }), {
        status: 200,
      });
    }

    // Get permissions for user's role
    const { data: rolePermissions, error } = await supabase
      .from("role_permissions")
      .select(
        `
        permissions (
          name
        )
      `
      )
      .eq("role_id", roleId);

    if (error) {
      console.error("User permissions fetch error:", error);
      return new Response(
        JSON.stringify({ success: false, message: "Xəta baş verdi" }),
        { status: 500 }
      );
    }

    const permissions =
      rolePermissions?.map((rp: any) => rp.permissions?.name).filter(Boolean) ||
      [];

    return new Response(
      JSON.stringify({
        success: true,
        permissions,
        role_id: roleId,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("User permissions error:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Server xətası" }),
      { status: 500 }
    );
  }
};
