import type { APIRoute } from "astro";
import { optimizeImage } from "wasm-image-optimization";

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const imageUrl = url.searchParams.get("url");
  const width = url.searchParams.get("w");
  const quality = url.searchParams.get("q");
  const format = url.searchParams.get("f") || "webp";

  if (!imageUrl) {
    return new Response("Missing 'url' parameter", { status: 400 });
  }

  // Yalnız öz CDN-imizdən gələn şəkilləri icazə ver (təhlükəsizlik)
  const allowedDomains = ["b-cdn.net", "the99.b-cdn.net"];
  try {
    const parsedUrl = new URL(imageUrl);
    const isAllowed = allowedDomains.some((domain) =>
      parsedUrl.hostname.endsWith(domain),
    );
    if (!isAllowed) {
      return new Response("Domain not allowed", { status: 403 });
    }
  } catch {
    return new Response("Invalid URL", { status: 400 });
  }

  try {
    // Orijinal şəkili çək
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return new Response("Failed to fetch image", { status: 502 });
    }

    const imageBuffer = await imageResponse.arrayBuffer();

    // WASM ilə optimize et
    const optimizedImage = await optimizeImage({
      image: imageBuffer,
      width: width ? parseInt(width) : undefined,
      quality: quality ? parseInt(quality) : 80,
      format: format as "webp" | "jpeg" | "png" | "avif",
    });

    // Content-Type təyin et
    const contentTypeMap: Record<string, string> = {
      webp: "image/webp",
      jpeg: "image/jpeg",
      png: "image/png",
      avif: "image/avif",
    };

    const contentType = contentTypeMap[format] || "image/webp";

    // Cache headers - 1 il cache et (immutable content)
    return new Response(optimizedImage, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control":
          "public, max-age=2592000, stale-while-revalidate=86400",
        "CDN-Cache-Control": "public, max-age=31536000",
        Vary: "Accept",
      },
    });
  } catch (error) {
    console.error("Image optimization error:", error);
    // Xəta baş verərsə, orijinal şəkili redirect et
    return Response.redirect(imageUrl, 302);
  }
};
