import type { APIContext } from "astro";
import { supabase } from "@/db/supabase";
import { sendContactEmail } from "@/utils/email";

export const POST = async (context: APIContext) => {
  try {
    const body = await context.request.json();
    const { fullName, email, subject, message } = body;

    // Basic validation
    if (!subject || !message) {
      return new Response(
        JSON.stringify({
          message: "Mövzu və müraciət məcburi xanalarıdır",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Supabase-ə müraciəti saxla
    const { data, error } = await supabase.from("contact_messages").insert([
      {
        full_name: fullName,
        email: email,
        subject: subject,
        message: message,
        created_at: new Date().toISOString(),
        status: "new",
      },
    ]);

    if (error) {
      console.error("Supabase error:", error);
      return new Response(
        JSON.stringify({
          message: "Müraciət saxlanarkən xəta baş verdi",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Email göndər
    try {
      await sendContactEmail({
        fullName: fullName || "Anonim",
        email: email || "Qeyd edilməyib",
        subject,
        message,
      });
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      // Email göndərilməsə belə, müraciət saxlanıb, uğurlu hesab edirik
    }

    return new Response(
      JSON.stringify({
        message:
          "Müraciətiniz uğurla göndərildi. Tezliklə sizinlə əlaqə saxlanacağıq.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Contact API error:", error);
    return new Response(
      JSON.stringify({
        message: "Bir xəta baş verdi",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
