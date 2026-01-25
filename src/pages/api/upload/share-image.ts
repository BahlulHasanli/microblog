import type { APIRoute } from "astro";
import { getUserFromCookies } from "@/utils/auth";

export const POST: APIRoute = async (context) => {
  console.log("[share-image] === API ÇAĞIRILDI ===");
  try {
    // Cloudflare Workers üçün runtime.env, lokal üçün import.meta.env
    const runtime = (context.locals as any).runtime;
    console.log("[share-image] Runtime:", !!runtime);
    const BUNNY_API_KEY = runtime?.env?.BUNNY_API_KEY || import.meta.env.BUNNY_API_KEY;
    const BUNNY_STORAGE_ZONE = runtime?.env?.BUNNY_STORAGE_ZONE || import.meta.env.BUNNY_STORAGE_ZONE || "the99-storage";
    
    if (!BUNNY_API_KEY) {
      console.error("BUNNY_API_KEY environment variable tapılmadı");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Server konfiqurasiya xətası: BUNNY_API_KEY təyin edilməyib",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Istifadəçi məlumatlarını al
    const user = await getUserFromCookies(context.cookies, () => null);

    if (!user?.email) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Daxil olmamısınız",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Form verilerini al
    const formData = await context.request.formData();
    const file = formData.get("file") as File;
    const shareId = formData.get("shareId") as string;
    const blurhash = formData.get("blurhash") as string | null;

    if (!file) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Şəkil seçilməyib",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!shareId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Paylaşım ID-si yoxdur",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Şəkil ölçüsünü yoxla
    if (file.size > 5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Şəkil 5MB-dan kiçik olmalıdır",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Şəkil tipini yoxla
    if (!file.type.startsWith("image/")) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Yalnız şəkil faylları qəbul olunur",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Unikal fayl adı yaratırıq (post ID-si ilə organize et)
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const fileExtension = file.name.split(".").pop();
    const fileName = `shares/${shareId}/${timestamp}-${random}.${fileExtension}`;

    console.log("[share-image] Yükləmə başlayır:", {
      fileName,
      fileSize: file.size,
      fileType: file.type,
      storageZone: BUNNY_STORAGE_ZONE,
    });

    // BunnyCDN-ə yüklə
    const arrayBuffer = await file.arrayBuffer();

    const uploadUrl = `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${fileName}`;
    console.log("[share-image] Upload URL:", uploadUrl);

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        AccessKey: BUNNY_API_KEY,
        "Content-Type": "application/octet-stream",
        "Content-Length": arrayBuffer.byteLength.toString(),
      },
      body: arrayBuffer,
    });

    console.log("[share-image] BunnyCDN cavabı:", uploadResponse.status, uploadResponse.statusText);

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("[share-image] BunnyCDN upload error:", errorText);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Şəkil yüklənərkən xəta baş verdi: ${uploadResponse.status} - ${errorText}`,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // CDN URL-i yaratırıq (pull zone istifadə edərək)
    // BUNNY_PULL_ZONE: https://storage.bunnycdn.com/the99-storage
    // Pull zone URL-i: https://the99.b-cdn.net
    const pullZoneUrl = "https://the99.b-cdn.net";
    const imageUrl = `${pullZoneUrl}/${fileName}`;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Şəkil uğurla yükləndi",
        imageUrl,
        blurhash,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Şəkil yüklənməsi xətası:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Xəta baş verdi",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
