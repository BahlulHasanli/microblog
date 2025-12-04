export const prerender = false;
import type { APIRoute } from "astro";
import { getUserFromCookies } from "@/utils/auth";

export const GET: APIRoute = async ({ cookies, redirect }) => {
  try {
    const user = await getUserFromCookies(cookies, () => null);

    if (!user) {
      // Cookie-ləri sil
      cookies.delete("sb-access-token", { path: "/" });
      cookies.delete("sb-refresh-token", { path: "/" });

      return new Response(
        JSON.stringify({
          user: null,
          authenticated: false,
          message: "Session expired",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        user: {
          id: user.id,
          email: user.email,
          name: user.fullname || user.username || user.email.split("@")[0],
          username: user.username,
          avatar: user.avatar,
        },
        authenticated: true,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in /api/auth/me:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        authenticated: false,
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
