import { jwtVerify, errors } from "jose";
import type { APIContext } from "astro";
import type { AstroCookies } from "astro";

// JWT secrets
const JWT_SECRET = import.meta.env.JWT_SECRET || "your-secret-key";

/**
 * Check if user is authenticated using Astro cookies
 */
export function isAuthenticated(cookies: AstroCookies): boolean {
  const accessToken = cookies.get('access-token');
  console.log('isAuthenticated - accessToken:', accessToken);
  return accessToken !== undefined && accessToken.value !== '';
}

/**
 * Get user info from access token cookie
 */
export async function getUserFromCookies(cookies: AstroCookies): Promise<any> {
  const accessToken = cookies.get('access-token');
  console.log('getUserFromCookies - accessToken:', accessToken);
  
  if (!accessToken || !accessToken.value) {
    console.log('getUserFromCookies - no token found');
    return null;
  }

  try {
    const { payload } = await jwtVerify(
      accessToken.value,
      new TextEncoder().encode(JWT_SECRET)
    );

    console.log('getUserFromCookies - payload:', payload);

    if (payload.type !== "access") {
      console.log('getUserFromCookies - invalid token type');
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
      fullName: payload.fullName
    };
  } catch (error) {
    console.log('getUserFromCookies - error:', error);
    return null;
  }
}

/**
 * Access token'ı doğrular və istifadəçi məlumatlarını qaytarır
 */
export async function verifyAccessToken(ctx: APIContext): Promise<any> {
  try {
    // Token'ı header və ya cookie'dən al
    let token = ctx.request.headers.get("Authorization");

    if (token && token.startsWith("Bearer ")) {
      token = token.substring(7);
    } else {
      // Cookie'dən yoxla
      const cookieHeader = ctx.request.headers.get("cookie");
      if (cookieHeader) {
        const cookies = cookieHeader.split(";").map((c) => c.trim());
        const accessCookie = cookies.find((c) => c.startsWith("access-token="));
        if (accessCookie) {
          token = accessCookie.split("=")[1];
        }
      }
    }

    if (!token) {
      return {
        success: false,
        error: "Token tapılmadı",
      };
    }

    // Check token
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(JWT_SECRET)
    );

    if (payload.type !== "access") {
      return {
        success: false,
        error: "Keçərsiz token növü",
      };
    }

    return {
      success: true,
      user: payload,
    };
  } catch (error) {
    if (error.code === "ERR_JWT_EXPIRED") {
      return {
        success: false,
        error: "Token müddəti bitib",
      };
    } else if (
      error.code === "ERR_JWT_INVALID" ||
      error.code === "ERR_JWS_INVALID"
    ) {
      return {
        success: false,
        error: "Keçərsiz token",
      };
    } else {
      return {
        success: false,
        error: "Token doğrulama xətası",
      };
    }
  }
}

/**
 * Qorunan endpoint'lər üçün middleware
 */
export async function requireAuth(ctx: APIContext): Promise<Response | any> {
  const authResult = await verifyAccessToken(ctx);

  if (!authResult.success) {
    return new Response(
      JSON.stringify({
        message: authResult.error || "Giriş tələb olunur",
        status: 401,
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return authResult.user!;
}
