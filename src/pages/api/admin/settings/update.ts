import type { APIRoute } from "astro";

export const POST: APIRoute = async ({
  request,
  locals,
}: {
  request: Request;
  locals: any;
}) => {
  const runtime = locals.runtime as any;
  const db = runtime.env.DB;

  try {
    // Admin yoxlaması
    const user = locals.user;
    if (!user || !user.is_admin) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Bu əməliyyat üçün admin hüququ tələb olunur",
        }),
        { status: 403 }
      );
    }

    const body = await request.json();

    // Settings cədvəlini yoxla, yoxdursa yarat
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      )
      .run();

    // Hər bir nizamlamanı yenilə və ya əlavə et
    const settingsToUpdate = [
      "site_title",
      "site_description",
      "site_keywords",
      "og_image",
      "twitter_handle",
      "google_analytics_id",
      "posts_per_page",
      "enable_comments",
      "enable_registration",
    ];

    for (const key of settingsToUpdate) {
      if (body[key] !== undefined) {
        const value = JSON.stringify(body[key]);

        await db
          .prepare(
            `INSERT INTO settings (key, value, updated_at) 
             VALUES (?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(key) DO UPDATE SET 
             value = excluded.value,
             updated_at = CURRENT_TIMESTAMP`
          )
          .bind(key, value)
          .run();
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Nizamlamalar uğurla yeniləndi",
      }),
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Settings update error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Xəta baş verdi",
      }),
      { status: 500 }
    );
  }
};
