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
    throw new Error("Dosya belirtilmedi");
  }

  // Dosya boyutu kontrolü (5MB)
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Dosya boyutu 5MB'dan büyük olamaz");
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

    // İlerleme simülasyonu
    let lastProgress = 0;
    const simulateProgress = () => {
      const progress = Math.min(lastProgress + 10, 90);
      lastProgress = progress;
      onProgress?.(progress);
    };

    const progressInterval = setInterval(simulateProgress, 300);
    console.log("Yükleme isteği gönderiliyor...");

    // API'ye istek gönder
    const response = await fetch("/api/bunny-upload", {
      method: "POST",
      body: formData,
    });

    clearInterval(progressInterval);
    console.log(`Yükleme yanıtı alındı: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Yükleme hata yanıtı:", errorData);
      throw new Error(errorData.message || "Resim yükleme başarısız oldu");
    }

    const data = await response.json();
    console.log("Yükleme başarılı, yanıt:", data);
    onProgress?.(100);

    // CDN URL'ini döndür
    return data.imageUrl;
  } catch (error) {
    console.error("Bunny CDN yükleme hatası:", error);
    throw new Error(`Resim yüklenirken bir hata oluştu: ${error.message}`);
  }
};
