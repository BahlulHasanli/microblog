import type { APIRoute } from "astro";
import * as https from "https";
import { requireAuth } from "../../utils/auth";

export const POST: APIRoute = async (context) => {
  try {
    // Kimlik doğrulama kontrolü
    const user = await requireAuth(context);
    if (!user) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Bu işlem için giriş yapmanız gerekiyor",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Bunny.net ayarları
    const REGION = "";
    const BASE_HOSTNAME = "storage.bunnycdn.com";
    const HOSTNAME = REGION ? `${REGION}.${BASE_HOSTNAME}` : BASE_HOSTNAME;
    const STORAGE_ZONE_NAME = "the99-storage";
    const ACCESS_KEY = "a3571a42-cb98-4dce-9b81d75e2c8c-5263-4043";
    
    let filePath: string | null = null;
    
    // İstek formatını kontrol et (JSON veya FormData)
    const contentType = context.request.headers.get("content-type") || "";
    
    if (contentType.includes("application/json")) {
      // JSON formatı için
      const body = await context.request.json();
      filePath = body.filePath;
    } else {
      // FormData formatı için
      const formData = await context.request.formData();
      filePath = formData.get("filePath")?.toString() || null;
    }

    if (!filePath) {
      return new Response(
        JSON.stringify({ 
          success: false,
          message: "Dosya yolu belirtilmedi" 
        }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`Bunny CDN'den dosya silme başlıyor: ${filePath}`);

    // Dosya silme işlemi
    let deleteSuccess = false;
    let errorMessage = "";

    try {
      // Fetch API ile silme deneyin
      const url = `https://${HOSTNAME}/${STORAGE_ZONE_NAME}/${filePath}`;
      console.log(`Fetch API ile silme deneniyor: ${url}`);

      const fetchResponse = await fetch(url, {
        method: "DELETE",
        headers: {
          AccessKey: ACCESS_KEY,
        },
      });

      if (fetchResponse.ok) {
        console.log(`Fetch API ile silme başarılı: ${fetchResponse.status}`);
        deleteSuccess = true;
      } else {
        const responseText = await fetchResponse.text();
        console.error(
          `Fetch API silme hatası: ${fetchResponse.status} - ${responseText}`
        );
        errorMessage = `Fetch API hatası: ${fetchResponse.status}`;
      }
    } catch (fetchError) {
      console.error("Fetch API silme hatası:", fetchError);
      errorMessage = `Fetch hatası: ${fetchError.message}`;
    }

    // Eğer fetch başarısız olduysa, geleneksel yöntemi dene
    if (!deleteSuccess) {
      try {
        console.log("Geleneksel yöntem ile silme deneniyor...");
        await deleteFromBunny(
          filePath,
          HOSTNAME,
          STORAGE_ZONE_NAME,
          ACCESS_KEY
        );
        deleteSuccess = true;
      } catch (traditionalError) {
        console.error("Geleneksel silme hatası:", traditionalError);
        if (!errorMessage) {
          errorMessage = `Geleneksel silme hatası: ${traditionalError.message}`;
        }
      }
    }

    if (!deleteSuccess) {
      // 404 hatası dosya bulunamadı anlamına gelir, bu durumda başarılı sayalım
      if (errorMessage.includes("404")) {
        console.log("Dosya zaten mevcut değil, silme başarılı sayılıyor");
        return new Response(
          JSON.stringify({
            success: true,
            message: "Dosya zaten mevcut değil",
          }),
          { 
            status: 200,
            headers: { "Content-Type": "application/json" } 
          }
        );
      }
      throw new Error(`Silme başarısız: ${errorMessage}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Dosya başarıyla silindi",
      }),
      { 
        status: 200,
        headers: { "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Bunny CDN silme hatası:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        message: "Dosya silme işlemi başarısız oldu" 
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
};

// Bunny.net'ten dosya silme fonksiyonu
function deleteFromBunny(
  filePath: string,
  hostname: string,
  storageZone: string,
  accessKey: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    // Log isteği
    console.log(`BunnyCDN silme başlatılıyor: ${filePath}`);
    console.log(`Host: ${hostname}, StorageZone: ${storageZone}`);

    const options = {
      method: "DELETE",
      host: hostname,
      path: `/${storageZone}/${filePath}`,
      headers: {
        AccessKey: accessKey,
      },
    };

    console.log("BunnyCDN istek ayarları:", JSON.stringify(options, null, 2));

    const req = https.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk.toString("utf8");
      });

      res.on("end", () => {
        console.log(`BunnyCDN yanıtı: Durum Kodu ${res.statusCode}`);
        console.log(`Yanıt: ${responseData}`);

        if (
          res.statusCode &&
          (res.statusCode >= 200 && res.statusCode < 300) ||
          res.statusCode === 404 // 404 de başarılı kabul edilir (dosya zaten yok)
        ) {
          console.log(`Dosya başarıyla silindi veya zaten yoktu: ${filePath}`);
          resolve(true);
        } else {
          console.error(
            `BunnyCDN silme hatası: ${res.statusCode} - ${responseData}`
          );
          reject(new Error(`HTTP Hata: ${res.statusCode} - ${responseData}`));
        }
      });
    });

    req.on("error", (error) => {
      console.error(`BunnyCDN istek hatası:`, error);
      reject(error);
    });

    req.end();
  });
}
