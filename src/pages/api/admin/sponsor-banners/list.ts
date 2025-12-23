import { supabase } from "@/db/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("sponsor_banners")
      .select("*")
      .order("position", { ascending: true });

    if (error) {
      return new Response(
        JSON.stringify({ success: false, message: error.message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, banners: data || [] }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sponsor bannerləri yükləmə xətası:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Xəta baş verdi" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
