import { APIContext } from "astro";

export async function POST(context: APIContext) {
  try {
    // Form verilerini al
    const formData = await context.request.formData();
    const imageUrl = formData.get("imageUrl") as string;

    if (!imageUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Resim URL'si zorunludur",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log(`API: Resim silme başlatılıyor: ${imageUrl}`);

    let filePath = "";

    try {
      const url = new URL(imageUrl);
      // URL'nin pathname kısmını al ve başındaki / işaretini kaldır
      filePath = url.pathname.substring(1);
      console.log(`API: Dosya yolu çıkarıldı: ${filePath}`);
    } catch (error) {
      console.error(`API: URL ayrıştırma hatası: ${error.message}`);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Geçersiz URL formatı: ${error.message}`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Bunny CDN ayarları
    const REGION = "";
    const BASE_HOSTNAME = "storage.bunnycdn.com";
    const HOSTNAME = REGION ? `${REGION}.${BASE_HOSTNAME}` : BASE_HOSTNAME;
    const STORAGE_ZONE_NAME = "the99-storage";
    const ACCESS_KEY = "a3571a42-cb98-4dce-9b81d75e2c8c-5263-4043";

    // Dosyayı BunnyCDN'den sil
    try {
      const deleteResponse = await fetch(
        `https://${HOSTNAME}/${STORAGE_ZONE_NAME}/${filePath}`,
        {
          method: "DELETE",
          headers: {
            AccessKey: ACCESS_KEY,
          },
        }
      );

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        throw new Error(
          `Silme hatası: ${deleteResponse.status} - ${errorText}`
        );
      }

      console.log(`API: Dosya başarıyla silindi: ${filePath}`);

      // Başarılı yanıt döndür
      return new Response(
        JSON.stringify({
          success: true,
          message: `Resim başarıyla silindi: ${filePath}`,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error(`API: Silme sırasında hata: ${error.message}`);

      // Hata yanıtı döndür
      return new Response(
        JSON.stringify({
          success: false,
          message: `Silme sırasında hata: ${error.message}`,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error(`API: Genel hata: ${error.message}`);

    // Genel hata yanıtı döndür
    return new Response(
      JSON.stringify({
        success: false,
        message: `Genel hata: ${error.message}`,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
