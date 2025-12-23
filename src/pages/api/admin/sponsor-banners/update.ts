import { supabase } from "@/db/supabase";

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const { id, is_active } = body;

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Banner ID doldurulmalıdır",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await supabase
      .from("sponsor_banners")
      .update({ is_active })
      .eq("id", id)
      .select();

    if (error) {
      return new Response(
        JSON.stringify({ success: false, message: error.message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: true, banner: data?.[0] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Sponsor banneri yeniləmə xətası:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Xəta baş verdi" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
