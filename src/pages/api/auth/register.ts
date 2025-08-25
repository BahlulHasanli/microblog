import type { APIRoute } from "astro";
import { supabase } from "@db/supabase";

export const prerender = false;

// Rate limit
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 dəqiqə
const MAX_REQUESTS = 5; // 15 dəqiqədə maksimum 5 qeydiyyat

// Email format validation
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

// Strong password validation
const isStrongPassword = (password: string): boolean => {
  const strongPasswordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return strongPasswordRegex.test(password) && password.length <= 128;
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

export const POST: APIRoute = async ({ clientAddress, request, redirect }) => {
  // Check rate limiting
  const clientIP =
    clientAddress || request.headers.get("x-forwarded-for") || "unknown";

  if (!checkRateLimit(clientIP)) {
    return new Response(
      JSON.stringify({
        message: `Bir neçə qeydiyyat istəyi göndərildi. 
          Zəhmət olmasa 15 dəqqiqə sonra təkrar cəhd edin.`,
        status: 429,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "900", // 15 dəqiqə
        },
      }
    );
  }

  const { email, password } = await request.json();

  if (!email || !password) {
    return new Response(
      JSON.stringify({
        message: `Email və şifrəni düzgün daxil edin`,
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
  const validPassword = isStrongPassword(password);

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

  if (!validPassword) {
    return new Response(
      JSON.stringify({
        message:
          "Şifrə ən az 8 simvol olmalıdır. Şifrənizdə böyük, kiçik hərf və simvol istifadə edilməlidir.",
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

  const { error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  const { error: insertError } = await supabase.from("users").insert({
    email,
  });

  if (insertError) {
    return new Response(insertError.message, { status: 500 });
  }

  return new Response(
    JSON.stringify({ email, message: "Qeydiyyat uğurla tamamlandı" }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
