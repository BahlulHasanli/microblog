import type { APIContext } from "astro";
import { supabase } from "@/db/supabase";

export const POST = async (context: APIContext) => {
  try {
    const body = await context.request.json();
    const { name, email, message } = body;

    // Basic validation
    if (!name || !message) {
      return new Response(
        JSON.stringify({
          message: "Ad soyad və müraciət məcburi xanalarıdır"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Supabase-ə müraciəti saxla
    const { data, error } = await supabase
      .from("vacancy_applications")
      .insert([
        {
          name: name,
          email: email,
          message: message,
          created_at: new Date().toISOString(),
          status: "new"
        }
      ]);

    if (error) {
      console.error("Supabase error:", error);
      return new Response(
        JSON.stringify({
          message: "Müraciət saxlanarkən xəta baş verdi"
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    return new Response(
      JSON.stringify({
        message: "Müraciətiniz uğurla göndərildi. Tezliklə sizinlə əlaqə saxlanacağıq."
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Vacancy API error:", error);
    return new Response(
      JSON.stringify({
        message: "Bir xəta baş verdi"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
