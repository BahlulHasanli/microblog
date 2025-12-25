export const prerender = false;
import type { APIRoute } from "astro";
import { supabase } from "@db/supabase";

// Rate limit
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 dəqiqə
const MAX_REQUESTS = 3; // 15 dəqiqədə maksimum 3 sorğu

// Email format validation
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

// Rate limit control
const checkRateLimit = (ip: string): boolean => {
  const now = Date.now();
  const userLimit = rateLimitStore.get(ip);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= MAX_REQUESTS) {
    return false;
  }

  userLimit.count++;
  return true;
};

export const POST: APIRoute = async ({ clientAddress, request }) => {
  // Check rate limiting
  const clientIP =
    clientAddress || request.headers.get("x-forwarded-for") || "unknown";

  if (!checkRateLimit(clientIP)) {
    return new Response(
      JSON.stringify({
        message: `Bir neçə şifirə sıfırlama istəyi göndərildi. Zəhmət olmasa 15 dəqqiqə sonra təkrar cəhd edin.`,
        status: 429,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "900",
        },
      }
    );
  }

  const { email } = await request.json();

  if (!email) {
    return new Response(
      JSON.stringify({
        message: "Email ünvanı daxil edilməlidir",
        status: 400,
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  const validEmail = isValidEmail(email);

  if (!validEmail) {
    return new Response(
      JSON.stringify({
        message: "Keçərli email ünvanı daxil edin",
        status: 400,
      }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${new URL(request.url).origin}/reset-password`,
    });

    if (error) {
      console.error("Password reset error:", error);
      return new Response(
        JSON.stringify({
          message:
            "Şifirə sıfırlama linki göndərilə bilmədi. Zəhmət olmasa daha sonra təkrar cəhd edin.",
          status: 500,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        message:
          "Şifirə sıfırlama linki email-ə göndərildi. Zəhmət olmasa email-inizi yoxlayın.",
        status: 200,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        message:
          "Bir xəta baş verdi. Zəhmət olmasa daha sonra təkrar cəhd edin.",
        status: 500,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
