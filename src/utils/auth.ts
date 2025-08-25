import { jwtVerify, errors } from "jose";
import type { APIContext } from "astro";
import type { AstroCookies } from "astro";
import { supabase } from "@/db/supabase";

// JWT secrets
const JWT_SECRET = import.meta.env.JWT_SECRET || "your-secret-key-change-this";

/**
 * Check if user is authenticated using Astro cookies
 */
export function isAuthenticated(
  cookies: AstroCookies,
  redirect?: (
    path: string,
    status?: 301 | 302 | 303 | 307 | 308 | 300 | 304
  ) => Response
): boolean {
  const accessToken = cookies.get("sb-access-token");
  const refreshToken = cookies.get("sb-refresh-token");

  return (
    accessToken !== undefined &&
    accessToken.value !== "" &&
    refreshToken !== undefined &&
    refreshToken.value !== ""
  );
}

/**
 * Get user info from access token cookie
 */
export async function getUserFromCookies(
  cookies: AstroCookies,
  redirect: any
): Promise<any> {
  try {
    const accessToken = cookies.get("sb-access-token");
    const refreshToken = cookies.get("sb-refresh-token");

    if (
      !accessToken ||
      !accessToken.value ||
      !refreshToken ||
      !refreshToken.value
    )
      return null;

    let session: any;

    try {
      session = await supabase.auth.setSession({
        refresh_token: refreshToken.value,
        access_token: accessToken.value,
      });
      if (session.error) {
        cookies.delete("sb-access-token", {
          path: "/",
        });

        cookies.delete("sb-refresh-token", {
          path: "/",
        });

        return redirect("/signin");
      }
    } catch (error) {
      cookies.delete("sb-access-token", {
        path: "/",
      });
      cookies.delete("sb-refresh-token", {
        path: "/",
      });

      return redirect("/signin");
    }

    const findUser = await supabase
      .from("users")
      .select("*")
      .eq("email", session.data.user?.email)
      .single();

    return findUser.data;
  } catch (error) {
    console.log("getUserFromCookies - error:", error);
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
