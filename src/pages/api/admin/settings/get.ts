import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ locals }: { locals: any }) => {
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

    // Bütün nizamlamaları al
    const settingsRows = await db
      .prepare("SELECT key, value FROM settings")
      .all();

    // Key-value obyektinə çevir
    const settings: any = {};
    for (const row of settingsRows.results) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        settings,
      }),
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Settings get error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Xəta baş verdi",
      }),
      { status: 500 }
    );
  }
};
