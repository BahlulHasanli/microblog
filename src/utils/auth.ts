import { jwtVerify, errors } from "jose";
import type { APIContext } from "astro";
import type { AstroCookies } from "astro";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createEphemeralSupabaseClient, supabaseAdmin } from "@/db/supabase";

// JWT secrets
const JWT_SECRET = import.meta.env.JWT_SECRET || "your-secret-key-change-this";

/**
 * Check if user is authenticated using Astro cookies
 */
export function isAuthenticated(
  cookies: AstroCookies,
  redirect?: (
    path: string,
    status?: 301 | 302 | 303 | 307 | 308 | 300 | 304,
  ) => Response,
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

function parseCookieHeader(header: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const segment of header.split(";")) {
    const trimmed = segment.trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const name = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    try {
      val = decodeURIComponent(val);
    } catch {
      /* olduğu kimi saxla */
    }
    out[name] = val;
  }
  return out;
}

function resolveSupabaseTokensFromRequest(
  cookies: AstroCookies,
  headers?: Headers | null,
): { access: string; refresh: string } {
  let access = cookies.get("sb-access-token")?.value?.trim() ?? "";
  let refresh = cookies.get("sb-refresh-token")?.value?.trim() ?? "";
  if ((!access || !refresh) && headers) {
    const p = parseCookieHeader(headers.get("cookie"));
    access = access || (p["sb-access-token"] ?? "").trim();
    refresh = refresh || (p["sb-refresh-token"] ?? "").trim();
  }
  return { access, refresh };
}

/**
 * Admin API-lərdə service role yoxdursa RLS üçün istifadəçi JWT ilə Supabase klienti.
 */
export async function createSupabaseWithCookieSession(
  cookies: AstroCookies,
  headers?: Headers | null,
): Promise<SupabaseClient | null> {
  const { access, refresh } = resolveSupabaseTokensFromRequest(
    cookies,
    headers,
  );
  if (!access || !refresh) return null;

  const client = createEphemeralSupabaseClient();
  const { error } = await client.auth.setSession({
    refresh_token: refresh,
    access_token: access,
  });
  if (error) return null;
  return client;
}

/**
 * Get user info from access token cookie
 */
export async function getUserFromCookies(
  cookies: AstroCookies,
  redirect: any,
  headers?: Headers | null,
): Promise<any> {
  try {
    const { access, refresh } = resolveSupabaseTokensFromRequest(cookies, headers);

    if (!access || !refresh) {
      return null;
    }

    const ephemeral = createEphemeralSupabaseClient();
    const { data: sessionData, error: sessionError } =
      await ephemeral.auth.setSession({
        refresh_token: refresh,
        access_token: access,
      });

    if (sessionError || !sessionData?.user) {
      // Cookie-ləri sil
      cookies.delete("sb-access-token", { path: "/" });
      cookies.delete("sb-refresh-token", { path: "/" });
      return null;
    }

    // İstifadəçini verilənlər bazasından al
    const userEmail = sessionData.user.email;
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("email", userEmail)
      .single();

    if (userError) {
      return null;
    }

    return userData;
  } catch (error) {
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
          c.startsWith("sb-access-token="),
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
      new TextEncoder().encode(JWT_SECRET),
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
        },
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
      },
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
        },
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
        },
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
      },
    );
  }
}

/**
 * Moderator endpoint'ləri üçün middleware
 */
export async function requireModerator(
  ctx: APIContext,
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
        },
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
        },
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
      },
    );
  }
}
