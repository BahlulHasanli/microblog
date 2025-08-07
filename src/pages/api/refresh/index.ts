import { db, users, eq } from "astro:db";
import type { APIRoute } from "astro";
import { sign, verify } from "jsonwebtoken";
import * as crypto from "crypto";

export const prerender = false;

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

export const POST: APIRoute = async (ctx) => {
  try {
    // Parse request body
    let body: { refreshToken?: string };

    try {
      body = await ctx.request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({
          message: "Keçərsiz JSON formatı",
          status: 400,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check refresh token from body or cookie
    let refreshToken = body.refreshToken;

    if (!refreshToken) {
      const cookieHeader = ctx.request.headers.get("cookie");
      if (cookieHeader) {
        const cookies = cookieHeader.split(";").map((c) => c.trim());
        const refreshCookie = cookies.find((c) =>
          c.startsWith("refresh-token=")
        );
        if (refreshCookie) {
          refreshToken = refreshCookie.split("=")[1];
        }
      }
    }

    if (!refreshToken) {
      return new Response(
        JSON.stringify({
          message: "Refresh token tələb olunur",
          status: 401,
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Verify refresh token
    let decoded: any;

    try {
      decoded = verify(refreshToken, REFRESH_SECRET);
    } catch (error) {
      return new Response(
        JSON.stringify({
          message: "Keçərsiz refresh token",
          status: 401,
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check if token exists in store and is not expired
    const storedToken = refreshTokenStore.get(decoded.tokenId);
    if (!storedToken || Date.now() > storedToken.expiresAt) {
      return new Response(
        JSON.stringify({
          message: "Refresh token müddəti bitib",
          status: 401,
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(decoded.userId)));

    if (!user) {
      return new Response(
        JSON.stringify({
          message: "İstifadəçi tapılmadı",
          status: 404,
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Create new access token
    const newAccessToken = sign(
      {
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
        type: "access",
      },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    // Create new refresh token
    const newRefreshTokenId = crypto.randomUUID();
    const newRefreshToken = sign(
      {
        tokenId: newRefreshTokenId,
        userId: user.id,
        email: user.email,
        type: "refresh",
      },
      REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    // Remove old refresh token and store new one
    refreshTokenStore.delete(decoded.tokenId);

    const refreshExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 gün

    refreshTokenStore.set(newRefreshTokenId, {
      userId: user.id.toString(),
      email: user.email,
      expiresAt: refreshExpiresAt,
    });

    // Return new tokens
    return new Response(
      JSON.stringify({
        message: "Token uğurla yeniləndi",
        status: 200,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": [
            `access-token=${newAccessToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=900; Path=/`, // 15 dəqiqə
            `refresh-token=${newRefreshToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/`, // 7 gün
          ].join(", "),
        },
      }
    );
  } catch (error) {
    console.error("Refresh token xətası:", error);
    return new Response(
      JSON.stringify({
        message: "Server xətası",
        status: 500,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
