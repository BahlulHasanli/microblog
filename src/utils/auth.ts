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
    ) {
      return null;
    }

    // Supabase client-i yarat və session-u qur
    const supabaseAuth = supabase.auth;

    // Session-u qur
    const { data: sessionData, error: sessionError } =
      await supabaseAuth.setSession({
        refresh_token: refreshToken.value,
        access_token: accessToken.value,
      });

    if (sessionError || !sessionData?.user) {
      console.log("Session error:", sessionError?.message);
      // Cookie-ləri sil
      cookies.delete("sb-access-token", { path: "/" });
      cookies.delete("sb-refresh-token", { path: "/" });
      return null;
    }

    // İstifadəçini verilənlər bazasından al
    const userEmail = sessionData.user.email;
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", userEmail)
      .single();

    if (userError) {
      console.log("User not found in database:", userError);
      return null;
    }

    return userData;
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
        const accessCookie = cookies.find((c) =>
          c.startsWith("sb-access-token=")
        );
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
  try {
    const user = await getUserFromCookies(ctx.cookies, () => null);

    if (!user) {
      return new Response(
        JSON.stringify({
          message: "Giriş tələb olunur",
          status: 401,
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return user;
  } catch (error) {
    console.error("requireAuth xətası:", error);
    return new Response(
      JSON.stringify({
        message: "Autentifikasiya xətası",
        status: 401,
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Admin yoxlaması - istifadəçinin admin olub-olmadığını yoxlayır
 * role_id: 1 = Admin
 */
export async function isAdmin(cookies: AstroCookies): Promise<boolean> {
  try {
    const user = await getUserFromCookies(cookies, () => null);
    if (!user) return false;

    return user.role_id === 1;
  } catch (error) {
    console.error("Admin yoxlama xətası:", error);
    return false;
  }
}

/**
 * Moderator yoxlaması - istifadəçinin moderator olub-olmadığını yoxlayır
 * role_id: 1 = Admin, 2 = Moderator
 * Admin də moderator hüquqlarına malikdir
 */
export async function isModerator(cookies: AstroCookies): Promise<boolean> {
  try {
    const user = await getUserFromCookies(cookies, () => null);
    if (!user) return false;

    return user.role_id === 1 || user.role_id === 2;
  } catch (error) {
    console.error("Moderator yoxlama xətası:", error);
    return false;
  }
}

/**
 * Editor yoxlaması - istifadəçinin editor olub-olmadığını yoxlayır
 * role_id: 1 = Admin, 2 = Moderator, 3 = Editor
 * Admin və Moderator da editor hüquqlarına malikdir
 */
export async function isEditor(cookies: AstroCookies): Promise<boolean> {
  try {
    const user = await getUserFromCookies(cookies, () => null);
    if (!user) return false;

    return user.role_id === 1 || user.role_id === 2 || user.role_id === 3;
  } catch (error) {
    console.error("Editor yoxlama xətası:", error);
    return false;
  }
}

/**
 * Admin endpoint'ləri üçün middleware
 */
export async function requireAdmin(ctx: APIContext): Promise<Response | any> {
  try {
    // Cookie-dən istifadəçi məlumatlarını al
    const user = await getUserFromCookies(ctx.cookies, () => null);

    if (!user) {
      return new Response(
        JSON.stringify({
          message: "Giriş tələb olunur",
          status: 401,
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Admin yoxlaması
    const adminCheck = await isAdmin(ctx.cookies);
    if (!adminCheck) {
      return new Response(
        JSON.stringify({
          message: "Bu əməliyyat üçün admin hüququ tələb olunur",
          status: 403,
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return user;
  } catch (error) {
    console.error("requireAdmin xətası:", error);
    return new Response(
      JSON.stringify({
        message: "Autentifikasiya xətası",
        status: 500,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Moderator endpoint'ləri üçün middleware
 */
export async function requireModerator(
  ctx: APIContext
): Promise<Response | any> {
  try {
    // Cookie-dən istifadəçi məlumatlarını al
    const user = await getUserFromCookies(ctx.cookies, () => null);

    if (!user) {
      return new Response(
        JSON.stringify({
          message: "Giriş tələb olunur",
          status: 401,
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Moderator yoxlaması
    const modCheck = await isModerator(ctx.cookies);
    if (!modCheck) {
      return new Response(
        JSON.stringify({
          message: "Bu əməliyyat üçün moderator hüququ tələb olunur",
          status: 403,
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return user;
  } catch (error) {
    console.error("requireModerator xətası:", error);
    return new Response(
      JSON.stringify({
        message: "Autentifikasiya xətası",
        status: 500,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
