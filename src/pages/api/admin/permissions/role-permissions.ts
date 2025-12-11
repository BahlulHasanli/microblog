import type { APIRoute } from "astro";
import { supabase } from "@/db/supabase";
import { getUserFromCookies } from "@/utils/auth";
import { hasPermission, Permissions } from "@/utils/permissions";

// GET - Get permissions for a specific role
export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    const user = await getUserFromCookies(cookies, null);

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, message: "Giriş tələb olunur" }),
        { status: 401 }
      );
    }

    if (!hasPermission(user.role_id, Permissions.ROLES_VIEW)) {
      return new Response(
        JSON.stringify({ success: false, message: "İcazəniz yoxdur" }),
        { status: 403 }
      );
    }

    const roleId = url.searchParams.get("role_id");

    if (roleId) {
      // Get permissions for specific role
      const { data: rolePermissions, error } = await supabase
        .from("role_permissions")
        .select(
          `
          permission_id,
          permissions (
            id,
            name,
            description,
            category
          )
        `
        )
        .eq("role_id", roleId);

      if (error) {
        console.error("Role permissions fetch error:", error);
        return new Response(
          JSON.stringify({ success: false, message: "Xəta baş verdi" }),
          { status: 500 }
        );
      }

      const permissions =
        rolePermissions?.map((rp: any) => rp.permissions) || [];

      return new Response(JSON.stringify({ success: true, permissions }), {
        status: 200,
      });
    } else {
      // Get all role permissions
      const { data: allRolePermissions, error } = await supabase.from(
        "role_permissions"
      ).select(`
          role_id,
          permission_id,
          permissions (
            name
          )
        `);

      if (error) {
        console.error("All role permissions fetch error:", error);
        return new Response(
          JSON.stringify({ success: false, message: "Xəta baş verdi" }),
          { status: 500 }
        );
      }

      // Group by role_id
      const rolePermissionsMap: Record<number, string[]> = {};
      allRolePermissions?.forEach((rp: any) => {
        if (!rolePermissionsMap[rp.role_id]) {
          rolePermissionsMap[rp.role_id] = [];
        }
        if (rp.permissions?.name) {
          rolePermissionsMap[rp.role_id].push(rp.permissions.name);
        }
      });

      return new Response(
        JSON.stringify({ success: true, rolePermissions: rolePermissionsMap }),
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Role permissions error:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Server xətası" }),
      { status: 500 }
    );
  }
};

// POST - Update permissions for a role
export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    const user = await getUserFromCookies(cookies, null);

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, message: "Giriş tələb olunur" }),
        { status: 401 }
      );
    }

    if (!hasPermission(user.role_id, Permissions.ROLES_EDIT)) {
      return new Response(
        JSON.stringify({ success: false, message: "İcazəniz yoxdur" }),
        { status: 403 }
      );
    }

    const body = await request.json();
    const { role_id, permission_ids } = body;

    if (!role_id || !Array.isArray(permission_ids)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "role_id və permission_ids tələb olunur",
        }),
        { status: 400 }
      );
    }

    // Delete existing permissions for this role
    const { error: deleteError } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", role_id);

    if (deleteError) {
      console.error("Delete role permissions error:", deleteError);
      return new Response(
        JSON.stringify({ success: false, message: "Xəta baş verdi" }),
        { status: 500 }
      );
    }

    // Insert new permissions
    if (permission_ids.length > 0) {
      const newPermissions = permission_ids.map((permissionId: number) => ({
        role_id,
        permission_id: permissionId,
      }));

      const { error: insertError } = await supabase
        .from("role_permissions")
        .insert(newPermissions);

      if (insertError) {
        console.error("Insert role permissions error:", insertError);
        return new Response(
          JSON.stringify({ success: false, message: "Xəta baş verdi" }),
          { status: 500 }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "İcazələr uğurla yeniləndi" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Update role permissions error:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Server xətası" }),
      { status: 500 }
    );
  }
};
