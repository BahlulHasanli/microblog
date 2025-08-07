import { db, users, isDbError, eq } from "astro:db";
import type { APIRoute } from "astro";
import * as bcrypt from "bcrypt";
import { SignJWT, jwtVerify } from "jose";
import * as crypto from "crypto";

export const prerender = false;

// Rate limit
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 dəqiqə

// JWT secrets
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";
const REFRESH_SECRET =
  process.env.REFRESH_SECRET || "your-refresh-secret-change-this";

// Token durations
const ACCESS_TOKEN_EXPIRY = "15m"; // 15 dəqiqə
const REFRESH_TOKEN_EXPIRY = "7d"; // 7 gün

// Refresh token store (production-da Redis istifadə edin)
const refreshTokenStore = new Map<
  string,
  { userId: string; email: string; expiresAt: number }
>();

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const attempts = loginAttempts.get(ip);

  if (!attempts) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
    return true;
  }

  // Lockout duration passed, reset
  if (now - attempts.lastAttempt > LOCKOUT_DURATION) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
    return true;
  }

  // Maximum attempts exceeded
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    return false;
  }

  // Increase attempt count
  attempts.count++;
  attempts.lastAttempt = now;
  return true;
}

export const POST: APIRoute = async (ctx) => {
  try {
    // Rate limit control
    const clientIP =
      ctx.clientAddress ||
      ctx.request.headers.get("x-forwarded-for") ||
      ctx.request.headers.get("x-real-ip") ||
      "unknown";

    // if (!checkRateLimit(clientIP)) {
    //   return new Response(
    //     JSON.stringify({
    //       message:
    //         "Çox sayda uğursuz giriş cəhdi. 15 dəqiqə sonra yenidən cəhd edin.",
    //       status: 429,
    //     }),
    //     {
    //       status: 429,
    //       headers: {
    //         "Content-Type": "application/json",
    //         "Retry-After": "900", // 15 dəqiqə
    //       },
    //     }
    //   );
    // }

    // Parse request body
    let { email, password } = await ctx.request.json();

    // Input validation
    if (!email || !password) {
      return new Response(
        JSON.stringify({
          message: "Email və şifrə tələb olunur",
          status: 400,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!isValidEmail(email)) {
      return new Response(
        JSON.stringify({
          message: "Keçərli email ünvanı daxil edin",
          status: 400,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Find user in database
    try {
      const [findUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      if (typeof findUser === "undefined") {
        return new Response(
          JSON.stringify({
            message: "İstifadəçi mövcud deyil",
            status: 401,
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (!findUser.email) {
        return new Response(
          JSON.stringify({
            message: "Email yanlışdır",
            status: 401,
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Password validation
      const isPasswordValid = await bcrypt.compare(password, findUser.password);

      if (!isPasswordValid) {
        return new Response(
          JSON.stringify({
            message: "Şifrə yanlışdır",
            status: 401,
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Create access token (kısa süreli)

      const accessToken = await new SignJWT({
        userId: findUser.id,
        email: findUser.email,
        fullName: findUser.fullName,
        type: "access",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime(ACCESS_TOKEN_EXPIRY)
        .sign(new TextEncoder().encode(JWT_SECRET));

      // Create refresh token (uzun süreli)
      const refreshTokenId = crypto.randomUUID();

      const refreshToken = await new SignJWT({
        tokenId: refreshTokenId,
        userId: findUser.id,
        email: findUser.email,
        type: "refresh",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime(REFRESH_TOKEN_EXPIRY)
        .sign(new TextEncoder().encode(REFRESH_SECRET));

      // Store refresh token
      const refreshExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 gün

      refreshTokenStore.set(refreshTokenId, {
        userId: findUser.id.toString(),
        email: findUser.email,
        expiresAt: refreshExpiresAt,
      });

      // Reset rate limit
      loginAttempts.delete(clientIP);

      // Set cookies using Response headers
      const response = new Response(
        JSON.stringify({
          message: "Uğurla daxil oldunuz",
          status: 200,
          user: {
            id: findUser.id,
            email: findUser.email,
            fullName: findUser.fullName,
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Set cookies separately (remove Secure for development)
      response.headers.append(
        "Set-Cookie",
        `access-token=${accessToken}; HttpOnly; SameSite=Strict; Max-Age=900; Path=/`
      );
      response.headers.append(
        "Set-Cookie",
        `refresh-token=${refreshToken}; HttpOnly; SameSite=Strict; Max-Age=604800; Path=/`
      );

      return response;
    } catch (dbError) {
      console.error("Database error:", dbError);
      return new Response(
        JSON.stringify({
          message: "Database error",
          status: 500,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Signin error:", error);

    if (isDbError(error)) {
      return new Response(
        JSON.stringify({
          message: "Database error",
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
        message: "Bilinməyən xəta baş verdi",
        status: 500,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
