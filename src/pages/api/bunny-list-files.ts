import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const url = new URL(request.url);
    const folder = url.searchParams.get("folder") || "og-media";

    // Bunny.net ayarları
    const REGION = "";
    const BASE_HOSTNAME = "storage.bunnycdn.com";
    const HOSTNAME = REGION ? `${REGION}.${BASE_HOSTNAME}` : BASE_HOSTNAME;
    const STORAGE_ZONE_NAME = "the99-storage";

    // API anahtarı
    const runtime = (locals as any).runtime;
    const ACCESS_KEY =
      runtime?.env?.BUNNY_API_KEY || import.meta.env.BUNNY_API_KEY;

    if (!ACCESS_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Server konfiqurasiya xətası: BUNNY_API_KEY təyin edilməyib",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Klasördəki faylları sıralamaq
    const listUrl = `https://${HOSTNAME}/${STORAGE_ZONE_NAME}/${folder}/`;

    const response = await fetch(listUrl, {
      method: "GET",
      headers: {
        AccessKey: ACCESS_KEY,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error(`Klasör sıralama hatası: ${response.status}`);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Fayllar sıralanarkən xəta baş verdi",
          files: [],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    // Şəkil fayllarını filtrə et
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const files = (data as any[])
      .filter((file: any) => {
        const fileName = file.ObjectName || file.name || "";
        return imageExtensions.some((ext) =>
          fileName.toLowerCase().endsWith(ext)
        );
      })
      .map((file: any) => {
        const fileName = file.ObjectName || file.name || "";
        return {
          name: fileName,
          url: `https://the99.b-cdn.net/${folder}/${fileName}`,
          size: file.Length || 0,
          dateModified: file.LastChanged || new Date().toISOString(),
        };
      })
      .sort(
        (a: any, b: any) =>
          new Date(b.dateModified).getTime() -
          new Date(a.dateModified).getTime()
      );

    return new Response(
      JSON.stringify({
        success: true,
        files,
        folder,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Faylları sıralama xətası:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: `Faylları sıralarkən xəta: ${error.message}`,
        files: [],
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
