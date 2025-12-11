import type { APIRoute } from "astro";
import { supabase } from "@/db/supabase";
import { getUserFromCookies } from "@/utils/auth";
import { hasPermission, Permissions } from "@/utils/permissions";

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const user = await getUserFromCookies(cookies, null);

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, message: "Giriş tələb olunur" }),
        { status: 401 }
      );
    }

    // Check if user has permission to view roles (which includes permissions)
    if (!hasPermission(user.role_id, Permissions.ROLES_VIEW)) {
      return new Response(
        JSON.stringify({ success: false, message: "İcazəniz yoxdur" }),
        { status: 403 }
      );
    }

    const { data: permissions, error } = await supabase
      .from("permissions")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Permissions fetch error:", error);
      return new Response(
        JSON.stringify({ success: false, message: "Xəta baş verdi" }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify({ success: true, permissions }), {
      status: 200,
    });
  } catch (error) {
    console.error("Permissions list error:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Server xətası" }),
      { status: 500 }
    );
  }
};
