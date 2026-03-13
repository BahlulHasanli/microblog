import type { APIRoute } from "astro";
import { supabase } from "@/db/supabase";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { currentPassword, newPassword } = await request.json();

    if (!newPassword || newPassword.length < 8) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Yeni şifrə ən az 8 simvol olmalıdır",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Auth olub-olmadığını yoxla
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: "Daxil olmamısınız" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Əgər currentPassword tələb olunarsa, burada verify edə bilərik,
    // Lakin supabase update user API direkt yeni şifrəni götürür (və server side idarə olunan session-larda bu kifayətdir)
    // Supabase signInWithPassword ilə köhnə şifrəni yoxlaya bilərik:
    if (currentPassword && user.email) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        return new Response(
          JSON.stringify({ success: false, message: "Cari şifrə yanlışdır" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Şifrəni yenilə
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return new Response(
        JSON.stringify({ success: false, message: updateError.message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Şifrə uğurla yeniləndi" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Change password error:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Server xətası" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
