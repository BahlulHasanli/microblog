import type { APIRoute } from "astro";
import { supabaseAdmin } from "@/db/supabase";

/**
 * Polar Webhook Handler
 * Polar-dan gələn ödəniş bildirişlərini qəbul edir və support_me cədvəlinə yazır
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    
    console.log("Polar webhook received:", JSON.stringify(body, null, 2));

    // Polar webhook event type-ını yoxla
    const eventType = body.type || body.event;
    
    // Checkout completed event-i yoxla
    if (eventType === "checkout.completed" || eventType === "checkout.updated") {
      const checkout = body.data || body;
      
      // Checkout statusunu yoxla
      if (checkout.status !== "succeeded" && checkout.status !== "completed") {
        console.log("Checkout not completed yet:", checkout.status);
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Custom metadata-dan məlumatları al
      const customerId = checkout.customer_id;
      const customerEmail = checkout.customer_email;
      const productId = checkout.product_id;
      const checkoutId = checkout.id;
      const amount = checkout.amount || checkout.total_amount || 0;
      const currency = checkout.currency || "USD";

      // URL parametrlərindən author_id-ni al
      // Checkout URL-də customerExternalId kimi göndərilir
      const metadata = checkout.metadata || {};
      const authorIdFromMetadata = metadata.author_id;

      console.log("Processing checkout:", {
        customerId,
        customerEmail,
        productId,
        checkoutId,
        amount,
        currency,
        authorIdFromMetadata,
      });

      // Author ID-ni tap
      let authorId = null;
      
      if (authorIdFromMetadata) {
        // Metadata-dan gəlirsə
        authorId = authorIdFromMetadata;
      } else {
        console.error("Author ID not found in checkout metadata");
        return new Response(
          JSON.stringify({ 
            error: "Author ID not found",
            received: true 
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Supporter-i tap (email ilə)
      let supporterId = null;
      
      if (customerEmail) {
        const { data: userData, error: userError } = await supabaseAdmin
          .from("users")
          .select("id")
          .eq("email", customerEmail)
          .single();
        
        if (userError) {
          console.error("Error finding supporter:", userError);
        } else {
          supporterId = userData?.id;
        }
      }

      if (!supporterId) {
        console.error("Supporter not found with email:", customerEmail);
        return new Response(
          JSON.stringify({ 
            error: "Supporter not found",
            received: true 
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Support qeydini yarat
      const { data: supportData, error: supportError } = await supabaseAdmin
        .from("support_me")
        .insert({
          supporter_id: supporterId,
          author_id: authorId,
          amount: amount / 100, // Polar cents ilə göndərir
          currency: currency,
          polar_checkout_id: checkoutId,
          polar_customer_id: customerId,
          status: "completed",
          metadata: {
            product_id: productId,
            checkout_data: checkout,
          },
        })
        .select()
        .single();

      if (supportError) {
        console.error("Error creating support record:", supportError);
        return new Response(
          JSON.stringify({ 
            error: supportError.message,
            received: true 
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      console.log("Support record created:", supportData);

      // Polar customer ID-ni users cədvəlinə yaz
      if (customerId && supporterId) {
        await supabaseAdmin
          .from("users")
          .update({ polar_customer_id: customerId })
          .eq("id", supporterId);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          supportId: supportData.id,
          received: true 
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Digər event type-ları üçün sadəcə qəbul et
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Polar webhook error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        received: true 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
