import type { APIRoute } from "astro";
import { isAuthenticated, isAdmin } from "@/utils/auth";
import { buildWriterAnalyticsData } from "@/lib/build-writer-analytics-data";

/**
 * Tək müəllif üzrə tam analitika (WriterAnalyticsTabs formatında).
 * Yalnız admin (role_id === 1).
 */
export const GET: APIRoute = async ({ cookies, url }) => {
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

    const authorId = url.searchParams.get("authorId");
    if (!authorId?.trim()) {
      return new Response(JSON.stringify({ error: "authorId tələb olunur" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await buildWriterAnalyticsData({ authorId: authorId.trim() });

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[admin/author-analytics]", e);
    return new Response(JSON.stringify({ error: "Server xətası" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
