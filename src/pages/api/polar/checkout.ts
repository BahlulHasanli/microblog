import type { APIRoute } from "astro";
import { Checkout } from "@polar-sh/astro";
import { getUserFromCookies } from "@/utils/auth";

/**
 * Polar Checkout Endpoint
 * İstifadəçinin autentifikasiyasını yoxlayır və Polar checkout-a yönləndirir
 */
export const GET: APIRoute = async (context) => {
  try {
    // İstifadəçinin login olub-olmadığını yoxla
    const user = await getUserFromCookies(context.cookies, context.redirect);
    
    if (!user) {
      // Login olmayan istifadəçiləri login səhifəsinə yönləndir
      return context.redirect("/login?redirect=/notes/" + (context.url.searchParams.get("redirect") || ""));
    }

    // İstifadəçi login olubsa, Polar checkout-a yönləndir
    const checkoutHandler = Checkout({
      accessToken: import.meta.env.POLAR_ACCESS_TOKEN_TEST,
      successUrl: import.meta.env.POLAR_SUCCESS_URL_TEST,
      server: "sandbox",
      theme: "light",
    });

    return checkoutHandler(context);
  } catch (error) {
    console.error("Checkout error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Checkout zamanı xəta baş verdi",
        message: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
