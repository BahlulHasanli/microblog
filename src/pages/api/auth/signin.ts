// With `output: 'static'` configured:
export const prerender = false;
import type { APIRoute } from "astro";
import { supabase } from "@db/supabase";

// Rate limit
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 dəqiqə
const MAX_REQUESTS = 5; // 15 dəqiqədə maksimum 5 qeydiyyat

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

export const POST: APIRoute = async ({
  clientAddress,
  request,
  cookies,
  redirect,
}) => {
  // Check rate limiting
  const clientIP =
    clientAddress || request.headers.get("x-forwarded-for") || "unknown";

  if (!checkRateLimit(clientIP)) {
    return new Response(
      JSON.stringify({
        message: `Bir neçə daxil olma istəyi göndərildi. 
        Zəhmət olmasa 15 dəqqiqə sonra təkrar cəhd edin.`,
        status: 429,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "900", // 15 dəqiqə
        },
      },
    );
  }

  const { email, password } = await request.json();

  if (!email || !password) {
    return new Response("Email and password are required", { status: 400 });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { access_token, refresh_token } = data.session;
  cookies.set("sb-access-token", access_token, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 gün
  });
  cookies.set("sb-refresh-token", refresh_token, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 gün
  });
  return new Response(
    JSON.stringify({ email, message: "Yönləndirilirsiniz.." }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
};
