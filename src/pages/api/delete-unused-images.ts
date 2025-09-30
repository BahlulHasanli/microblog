import { APIContext } from "astro";

export async function POST(context: APIContext) {
  try {
    // İsteğin Content-Type başlığını kontrol et
    const contentType = context.request.headers.get('content-type') || '';
    
    let images: string[] = [];
    
    // İsteğin formatına göre işle
    if (contentType.includes('application/json')) {
      // JSON formatında gelen istek
      const data = await context.request.json();
      images = data.images || [];
      console.log('JSON formatında istek alındı');
    } else if (contentType.includes('text/plain')) {
      // Düz metin formatında gelen istek
      const text = await context.request.text();
      try {
        const data = JSON.parse(text);
        images = data.images || [];
        console.log('Text/plain formatında JSON istek alındı');
      } catch (e) {
        console.error('JSON ayrıştırma hatası:', e);
      }
    } else {
      // Diğer formatlar için (sendBeacon genellikle blob olarak gönderir)
      try {
        const blob = await context.request.blob();
        const text = await blob.text();
        const data = JSON.parse(text);
        images = data.images || [];
        console.log('Blob formatında istek alındı');
      } catch (e) {
        // Son çare olarak raw body'yi okumaya çalış
        try {
          const text = await context.request.text();
          const data = JSON.parse(text);
          images = data.images || [];
          console.log('Raw body formatında istek alındı');
        } catch (e) {
          console.error('Veri ayrıştırma hatası:', e);
        }
      }
    }
    
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
    
    // Resimleri sildikten sonra, klasörleri de sil
    // Benzersiz klasörleri bul (notes/[slug]/images/)
    const folders = new Set<string>();
    images.forEach((imageUrl: string) => {
      try {
        const url = new URL(imageUrl);
        const filePath = url.pathname.substring(1);
        // Dosya yolundan klasör yolunu çıkar (son / işaretine kadar)
        const folderPath = filePath.substring(0, filePath.lastIndexOf('/'));
        if (folderPath) {
          folders.add(folderPath);
        }
      } catch (error) {
        console.error('Klasör yolu çıkarma hatası:', error);
      }
    });
    
    console.log(`API: ${folders.size} klasör silinecek:`, Array.from(folders));
    
    // Her klasörü sil
    const folderResults = await Promise.allSettled(
      Array.from(folders).map(async (folderPath: string) => {
        try {
          // Klasörü sil (BunnyCDN'de klasör silmek için sonuna / eklemek gerekiyor)
          const deleteResponse = await fetch(
            `https://${HOSTNAME}/${STORAGE_ZONE_NAME}/${folderPath}/`,
            {
              method: "DELETE",
              headers: {
                AccessKey: ACCESS_KEY,
              },
            }
          );
          
          if (!deleteResponse.ok) {
            const errorText = await deleteResponse.text();
            console.error(`API: Klasör silme hatası: ${folderPath}`, errorText);
            return { success: false, folder: folderPath, error: `Silme hatası: ${deleteResponse.status}` };
          }
          
          console.log(`API: Klasör başarıyla silindi: ${folderPath}`);
          
          // Üst klasörleri de sil (notes/[slug]/)
          const parentFolder = folderPath.substring(0, folderPath.lastIndexOf('/'));
          if (parentFolder && parentFolder.startsWith('notes/')) {
            console.log(`API: Üst klasör siliniyor: ${parentFolder}`);
            const parentDeleteResponse = await fetch(
              `https://${HOSTNAME}/${STORAGE_ZONE_NAME}/${parentFolder}/`,
              {
                method: "DELETE",
                headers: {
                  AccessKey: ACCESS_KEY,
                },
              }
            );
            
            if (parentDeleteResponse.ok) {
              console.log(`API: Üst klasör başarıyla silindi: ${parentFolder}`);
            } else {
              console.error(`API: Üst klasör silme hatası: ${parentFolder}`);
            }
          }
          
          return { success: true, folder: folderPath };
        } catch (error) {
          console.error(`API: Klasör silme sırasında hata: ${error.message}`);
          return { success: false, folder: folderPath, error: error.message };
        }
      })
    );
    
    const foldersDeleted = folderResults.filter(
      result => result.status === 'fulfilled' && (result.value as any).success
    ).length;
    
    console.log(`API: ${foldersDeleted} klasör başarıyla silindi`);
    
    // Başarılı yanıt döndür
    return new Response(
      JSON.stringify({
        success: true,
        message: `${successful} resim ve ${foldersDeleted} klasör başarıyla silindi, ${failed} resim silinemedi`,
        results: results.map(result => 
          result.status === 'fulfilled' ? result.value : { success: false, error: 'Promise rejected' }
        ),
        foldersDeleted,
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
