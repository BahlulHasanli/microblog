import { supabase } from "@/db/supabase";

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Banner ID doldurulmalıdır",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Əvvəlcə banneri al
    const { data: bannerData, error: fetchError } = await supabase
      .from("sponsor_banners")
      .select("click_count")
      .eq("id", id)
      .single();

    if (fetchError || !bannerData) {
      return new Response(
        JSON.stringify({ success: false, message: "Banner tapılmadı" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Kliklənmə sayını artır
    const { data, error } = await supabase
      .from("sponsor_banners")
      .update({ click_count: (bannerData.click_count || 0) + 1 })
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
    console.error("Sponsor banneri kliklənmə qeyd xətası:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Xəta baş verdi" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
