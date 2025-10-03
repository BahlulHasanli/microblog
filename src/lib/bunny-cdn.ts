import { slugify } from "../utils/slugify";

interface BunnyUploadOptions {
  file: File;
  slug?: string;
  folder?: string;
  onProgress?: (progress: number) => void;
}

export const uploadToBunny = async ({
  file,
  slug,
  folder = "images",
  onProgress,
}: BunnyUploadOptions): Promise<string> => {
  if (!file) {
    console.error("uploadToBunny: Dosya belirtilmedi");
    throw new Error("Dosya belirtilmedi");
  }

  // Dosya boyutu kontrolü (5MB)
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    console.error(`uploadToBunny: Dosya boyutu çok büyük: ${file.size} byte`);
    throw new Error("Dosya boyutu 5MB'dan büyük olamaz");
  }
  
  console.log(`uploadToBunny: Başlatılıyor - Dosya: ${file.name}, Boyut: ${file.size} byte, Slug: ${slug}, Klasör: ${folder}`);
  
  // Dosya tipini kontrol et
  console.log(`uploadToBunny: Dosya tipi: ${file.type}`);
  
  // Dosya içeriğini kontrol et
  try {
    const arrayBuffer = await file.arrayBuffer();
    console.log(`uploadToBunny: Dosya içeriği okundu, boyut: ${arrayBuffer.byteLength} byte`);
  } catch (error) {
    console.error(`uploadToBunny: Dosya içeriği okunamadı: ${error.message}`);
  }

  try {
    console.log(`Bunny CDN'e yükleme başlıyor: ${file.name}, boyut: ${file.size} byte`);
    
    // Dosya adını oluştur
    const fileName = slug || `${Date.now()}-${Math.floor(Math.random() * 10000)}.${file.name.split(".").pop() || "jpg"}`;

    // CDN URL'sini oluştur
    const cdnUrl = `https://the99.b-cdn.net/${folder}/${fileName}`;

    // Dosya yolunu oluştur
    const filePath = folder ? `${folder}/${fileName}` : fileName;
    console.log(`Oluşturulan dosya yolu: ${filePath}`);

    // FormData oluştur
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileName", fileName);
    formData.append("filePath", filePath);
    formData.append("uploadType", "general"); // Varsayılan yükleme türü
    
    // Dosya içeriğini bir kez daha kontrol et
    try {
      // Dosya boyutunu kontrol et
      console.log(`uploadToBunny: FormData'ya eklenen dosya boyutu: ${file.size} byte`);
      
      // Dosya içeriğini kontrol et
      const testArrayBuffer = await file.arrayBuffer();
      console.log(`uploadToBunny: Dosya içeriği tekrar okundu, boyut: ${testArrayBuffer.byteLength} byte`);
      
      // Dosya tipini kontrol et
      console.log(`uploadToBunny: FormData'ya eklenen dosya tipi: ${file.type}`);
    } catch (error) {
      console.error(`uploadToBunny: FormData kontrolü sırasında hata: ${error.message}`);
    }

    // İlerleme simülasyonu
    let lastProgress = 0;
    const simulateProgress = () => {
      const progress = Math.min(lastProgress + 10, 90);
      lastProgress = progress;
      onProgress?.(progress);
    };

    const progressInterval = setInterval(simulateProgress, 300);
    console.log("uploadToBunny: Yükleme isteği gönderiliyor...");

    // API'ye istek gönder
    let response;
    try {
      response = await fetch("/api/bunny-upload", {
        method: "POST",
        body: formData,
      });
      
      clearInterval(progressInterval);
      console.log(`uploadToBunny: Yükleme yanıtı alındı: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        let errorMessage = `HTTP Hata: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          console.error("uploadToBunny: Yükleme hata yanıtı:", errorData);
          errorMessage = errorData.message || errorMessage;
        } catch (jsonError) {
          console.error("uploadToBunny: Hata yanıtı JSON olarak okunamadı:", jsonError);
          try {
            const errorText = await response.text();
            console.error("uploadToBunny: Hata yanıtı metni:", errorText);
            errorMessage += ` - ${errorText}`;
          } catch (textError) {
            console.error("uploadToBunny: Hata yanıtı metin olarak da okunamadı:", textError);
          }
        }
        throw new Error(`Resim yükleme başarısız oldu: ${errorMessage}`);
      }
      
      const data = await response.json();
      console.log("uploadToBunny: Yükleme başarılı, yanıt:", data);
      onProgress?.(100);
      
      // CDN URL'ini döndür
      if (data.imageUrl) {
        console.log(`uploadToBunny: CDN URL'si döndürülüyor: ${data.imageUrl}`);
        return data.imageUrl;
      } else {
        console.error("uploadToBunny: Yanıtta imageUrl bulunamadı:", data);
        throw new Error("Resim yükleme başarılı ancak URL dönmedi");
      }
    } catch (fetchError) {
      clearInterval(progressInterval);
      console.error("uploadToBunny: Fetch hatası:", fetchError);
      throw new Error(`Resim yükleme isteği başarısız oldu: ${fetchError.message}`);
    }
  } catch (error) {
    console.error("Bunny CDN yükleme hatası:", error);
    throw new Error(`Resim yüklenirken bir hata oluştu: ${error.message}`);
  }
};
