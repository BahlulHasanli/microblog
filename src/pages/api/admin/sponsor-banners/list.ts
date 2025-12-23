import { supabase } from "@/db/supabase";

export async function GET() {
  try {
    console.log("=== LIST ENDPOINT DEBUG ===");

    const { data, error } = await supabase
      .from("sponsor_banners")
      .select("*")
      .order("click_count", { ascending: false });

    console.log("Error:", error);
    console.log("Data:", data);
    console.log("Data count:", data?.length);

    if (error) {
      console.error("Query error:", error.message);
      return new Response(
        JSON.stringify({
          success: false,
          message: error.message,
          error: error,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("✓ Successfully fetched banners:", data?.length);
    return new Response(
      JSON.stringify({ success: true, banners: data || [] }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sponsor bannerləri yükləmə xətası:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Xəta baş verdi",
        error: String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
