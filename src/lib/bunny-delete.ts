/**
 * BunnyCDN'den resim silme işlemlerini yöneten yardımcı fonksiyon
 */

interface BunnyDeleteOptions {
  imageUrl: string;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

/**
 * BunnyCDN'den bir resmi siler
 * @param options Silme işlemi için gerekli parametreler
 * @returns Promise<boolean> Silme işleminin başarılı olup olmadığı
 */
export const deleteFromBunny = async ({
  imageUrl,
  onSuccess,
  onError,
}: BunnyDeleteOptions): Promise<boolean> => {
  if (!imageUrl || !imageUrl.includes("the99.b-cdn.net")) {
    console.error("Geçersiz resim URL'si:", imageUrl);
    onError?.("Geçersiz resim URL'si");
    return false;
  }

  try {
    // URL'den dosya yolunu çıkar
    const cdnPrefix = "https://the99.b-cdn.net/";
    const filePath = imageUrl.replace(cdnPrefix, "");

    // FormData oluştur
    const formData = new FormData();
    formData.append("filePath", filePath);

    // API'ye istek gönder
    const response = await fetch("/api/bunny-delete", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Silme hatası:", errorData);
      onError?.(errorData.message || "Resim silme başarısız oldu");
      return false;
    }

    const data = await response.json();
    console.log("Silme başarılı:", data);
    onSuccess?.();
    return true;
  } catch (error) {
    console.error("Resim silme hatası:", error);
    onError?.(error.message || "Resim silinirken bir hata oluştu");
    return false;
  }
};
