import type { APIRoute } from "astro";
import { verify } from "jsonwebtoken";

export const prerender = false;

// JWT secrets
const REFRESH_SECRET = process.env.REFRESH_SECRET || "your-refresh-secret-change-this";

// Refresh token store (production-da Redis istifadə edin)
const refreshTokenStore = new Map<string, { userId: string; email: string; expiresAt: number }>();

export const POST: APIRoute = async (ctx) => {
  try {
    // Parse request body
    let body: { refreshToken?: string };

    try {
      body = await ctx.request.json();
    } catch (error) {
      // JSON parse error is not critical for logout
      body = {};
    }

    // Check refresh token from body or cookie
    let refreshToken = body.refreshToken;
    
    if (!refreshToken) {
      const cookieHeader = ctx.request.headers.get("cookie");
      if (cookieHeader) {
        const cookies = cookieHeader.split(";").map(c => c.trim());
        const refreshCookie = cookies.find(c => c.startsWith("refresh-token="));
        if (refreshCookie) {
          refreshToken = refreshCookie.split("=")[1];
        }
      }
    }

    // If refresh token exists, invalidate it
    if (refreshToken) {
      try {
        const decoded = verify(refreshToken, REFRESH_SECRET) as any;
        if (decoded.tokenId) {
          refreshTokenStore.delete(decoded.tokenId);
        }
      } catch (error) {
        // Token might be invalid, but we still want to clear cookies
        console.log("Refresh token decode error during logout:", error);
      }
    }

    // Clear cookies and return success
    return new Response(
      JSON.stringify({
        message: "Uğurla çıxış edildi",
        status: 200,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": [
            `access-token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/`,
            `refresh-token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/`
          ].join(', '),
        },
      }
    );

  } catch (error) {
    console.error("Logout xətası:", error);
    return new Response(
      JSON.stringify({
        message: "Çıxış zamanı xəta baş verdi",
        status: 500,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
