import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  try {
    // Clear access token cookie and return success
    return new Response(
      JSON.stringify({
        message: "Uğurla çıxış edildi",
        status: 200,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": `access-token=; HttpOnly; SameSite=Strict; Max-Age=0; Path=/`
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
