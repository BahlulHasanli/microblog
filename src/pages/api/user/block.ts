import type { APIRoute } from "astro";
import { supabase } from "@/db/supabase";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { targetUserId } = await request.json();

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ success: false, message: "Target user ID tələb olunur" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get current user
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

    if (user.id === targetUserId) {
      return new Response(
        JSON.stringify({ success: false, message: "Özünüzü bloklaya bilməzsiniz" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if block already exists
    const { data: existingBlock, error: checkError } = await supabase
      .from("user_blocks")
      .select("id")
      .eq("blocker_id", user.id)
      .eq("blocked_id", targetUserId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
       return new Response(
        JSON.stringify({ success: false, message: "Server xətası" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (existingBlock) {
      // Unblock
      const { error: deleteError } = await supabase
        .from("user_blocks")
        .delete()
        .eq("id", existingBlock.id);

      if (deleteError) throw deleteError;

      return new Response(
        JSON.stringify({ success: true, action: "unblocked", message: "İstifadəçi blokdan çıxarıldı" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } else {
      // Block
      const { error: insertError } = await supabase
        .from("user_blocks")
        .insert({
          blocker_id: user.id,
          blocked_id: targetUserId,
        });

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({ success: true, action: "blocked", message: "İstifadəçi bloklandı" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error: any) {
    console.error("Block/Unblock error:", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message || "Xəta baş verdi" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
