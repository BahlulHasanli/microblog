import { supabase } from "@/db/supabase";

export async function POST({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const { title, description, image_url, banner_url, is_active, position } =
      body;

    if (!title || !image_url || !banner_url) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Başlıq, şəkil və URL doldurulmalıdır",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await supabase
      .from("sponsor_banners")
      .insert([
        {
          title,
          description: description || "",
          image_url,
          banner_url,
          is_active: is_active !== false,
          position: position || 0,
        },
      ])
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
    console.error("Sponsor banneri yaratma xətası:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Xəta baş verdi" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
