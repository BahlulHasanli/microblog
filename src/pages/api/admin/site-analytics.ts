import type { APIRoute } from "astro";
import { isAuthenticated, isAdmin } from "@/utils/auth";
import { buildAdminAnalyticsOverview } from "@/lib/build-writer-analytics-data";

/**
 * Admin panel üzrə ümumi sayt aqreqatı və müəllif siyahısı.
 * Tam detal üçün `/api/admin/author-analytics?authorId=`.
 * Yalnız admin (role_id === 1).
 */
export const GET: APIRoute = async ({ cookies }) => {
  try {
    if (!isAuthenticated(cookies)) {
      return new Response(JSON.stringify({ error: "Giriş tələb olunur" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!(await isAdmin(cookies))) {
      return new Response(JSON.stringify({ error: "İcazə yoxdur" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await buildAdminAnalyticsOverview();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[admin/site-analytics]", e);
    return new Response(JSON.stringify({ error: "Server xətası" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
