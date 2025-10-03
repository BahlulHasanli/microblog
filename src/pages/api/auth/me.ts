import type { APIRoute } from "astro";
import { getUserFromCookies } from "@/utils/auth";

export const GET: APIRoute = async ({ cookies, redirect }) => {
  try {
    const user = await getUserFromCookies(cookies, redirect);
    
    if (!user) {
      return new Response(JSON.stringify({ 
        user: null,
        authenticated: false 
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }

    return new Response(JSON.stringify({
      user: {
        id: user.id,
        email: user.email,
        name: user.name || user.username || user.email.split('@')[0],
        avatar: user.avatar
      },
      authenticated: true
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("Error in /api/auth/me:", error);
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      authenticated: false 
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
};
