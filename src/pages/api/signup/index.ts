import db from "../../../../db";
import { usersTable } from "../../../../db/schema";
import { eq } from "drizzle-orm";

// MySQL hata işleme için
type DatabaseError = Error & { code?: string };
import type { APIRoute } from "astro";
import * as bcrypt from "bcrypt";
import { SignJWT, jwtVerify } from "jose";
import * as crypto from "crypto";
import { sign } from "crypto";

export const prerender = false;

// Rate limit
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 dəqiqə
const MAX_REQUESTS = 5; // 15 dəqiqədə maksimum 5 qeydiyyat

// JWT secret
const JWT_SECRET = import.meta.env.JWT_SECRET;

// Token duration
const ACCESS_TOKEN_EXPIRY = "1d";

function getExpiryInSeconds(expiry: string): number {
  const unit = expiry.slice(-1);
  const value = parseInt(expiry.slice(0, -1));

  switch (unit) {
    case "s":
      return value;
    case "m":
      return value * 60;
    case "h":
      return value * 60 * 60;
    case "d":
      return value * 24 * 60 * 60;
    default:
      return 900; // Varsayılan olarak 15 dakika (900 saniye)
  }
}

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

// Input sanitization
const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>"'&]/g, "");
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

export const POST: APIRoute = async (ctx) => {
  try {
    // Check rate limiting
    const clientIP =
      ctx.clientAddress ||
      ctx.request.headers.get("x-forwarded-for") ||
      "unknown";

    if (!checkRateLimit(clientIP)) {
      return new Response(
        JSON.stringify({
          message:
            "Bir neçə qeydiyyat istəyi göndərildi. Zəhmət olmasa 15 dəqqiqə sonra təkrar cəhd edin.",
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

    // Check request body
    let body = await ctx.request.json();

    // Check required fields
    if (!body.fullName || !body.email || !body.password) {
      return new Response(
        JSON.stringify({
          message: "Bütün xanalar məcburidir",
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

    // Input validation & sanitization
    const fullName = sanitizeInput(body.fullName);
    const email = sanitizeInput(body.email.toLowerCase());
    const password = body.password;

    // Validation
    if (fullName.length < 2 || fullName.length > 100) {
      return new Response(
        JSON.stringify({
          message: "Ad-soyad 2-100 simvol arasında olmalıdır",
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

    if (!isValidEmail(email)) {
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

    if (!isStrongPassword(password)) {
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

    // Password salt
    const saltRounds: number = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Save to database
    const now = Math.floor(Date.now() / 1000); // Unix timestamp

    const result = await db.insert(usersTable).values({
      fullName,
      email,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    });

    if (!result) {
      return new Response(
        JSON.stringify({
          message: "Xəta baş verdi",
          status: 201,
        }),
        {
          status: 201,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Get the created user ID
    const newUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .then((rows) => rows[0]);

    if (!newUser) {
      throw new Error("İstifadəçi mövcud deyil");
    }

    // Create access token
    const accessToken = await new SignJWT({
      userId: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      type: "access",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(ACCESS_TOKEN_EXPIRY)
      .sign(new TextEncoder().encode(JWT_SECRET));

    // Set cookies using Response headers
    const response = new Response(
      JSON.stringify({
        message: "Uğurla qeydiyyatdan keçdiniz",
        status: 201,
        user: {
          id: newUser.id,
          email: newUser.email,
          fullName: newUser.fullName,
        },
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    // Set access token cookie (1 gün süreli)
    const maxAge = getExpiryInSeconds(ACCESS_TOKEN_EXPIRY);
    response.headers.append(
      "Set-Cookie",
      `access-token=${accessToken}; HttpOnly; SameSite=Strict; Max-Age=${maxAge}; Path=/`
    );

    return response;
  } catch (e) {
    console.error("Qeydiyyat xətası:", e);

    if ((e as DatabaseError).code) {
      // Email already exists
      if (
        e.message.includes("UNIQUE constraint failed") ||
        e.message.includes("email")
      ) {
        return new Response(
          JSON.stringify({
            message: "Bu email ünvanı artıq istifadə olunub",
            status: 409,
          }),
          {
            status: 409,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
      }

      return new Response(
        JSON.stringify({
          message: "Qeydiyyat xətası",
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

    return new Response(
      JSON.stringify({
        message: "Bilinməyən xəta baş verdi",
        status: 500,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};
