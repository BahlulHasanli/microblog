import { APIContext } from "astro";

export async function POST(context: APIContext) {
  try {
    // JSON verisini al
    const data = await context.request.json();
    const { images } = data;
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Geçerli resim listesi bulunamadı",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    console.log(`API: ${images.length} kullanılmayan resim silme işlemi başlatılıyor`);
    
    // Bunny CDN ayarları
    const REGION = "";
    const BASE_HOSTNAME = "storage.bunnycdn.com";
    const HOSTNAME = REGION ? `${REGION}.${BASE_HOSTNAME}` : BASE_HOSTNAME;
    const STORAGE_ZONE_NAME = "the99-storage";
    const ACCESS_KEY = "a3571a42-cb98-4dce-9b81d75e2c8c-5263-4043";
    
    // Her bir resim için silme işlemi yap
    const results = await Promise.allSettled(
      images.map(async (imageUrl: string) => {
        try {
          // BunnyCDN URL'sinden dosya yolunu çıkar
          let filePath = "";
          try {
            const url = new URL(imageUrl);
            // URL'nin pathname kısmını al ve başındaki / işaretini kaldır
            filePath = url.pathname.substring(1);
            console.log(`API: Dosya yolu çıkarıldı: ${filePath}`);
          } catch (error) {
            console.error(`API: URL ayrıştırma hatası: ${error.message}`);
            return { success: false, url: imageUrl, error: `Geçersiz URL formatı: ${error.message}` };
          }
          
          // Dosyayı BunnyCDN'den sil
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
            return { 
              success: false, 
              url: imageUrl, 
              error: `Silme hatası: ${deleteResponse.status} - ${errorText}` 
            };
          }
          
          console.log(`API: Dosya başarıyla silindi: ${filePath}`);
          return { success: true, url: imageUrl };
        } catch (error) {
          console.error(`API: Silme sırasında hata: ${error.message}`);
          return { success: false, url: imageUrl, error: error.message };
        }
      })
    );
    
    // Sonuçları analiz et
    const successful = results.filter(
      result => result.status === 'fulfilled' && (result.value as any).success
    ).length;
    
    const failed = results.length - successful;
    
    console.log(`API: ${successful} resim başarıyla silindi, ${failed} resim silinemedi`);
    
    // Başarılı yanıt döndür
    return new Response(
      JSON.stringify({
        success: true,
        message: `${successful} resim başarıyla silindi, ${failed} resim silinemedi`,
        results: results.map(result => 
          result.status === 'fulfilled' ? result.value : { success: false, error: 'Promise rejected' }
        ),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
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
