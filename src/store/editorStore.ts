import { atom } from 'nanostores';

// Kaydedilmemiş değişiklikleri izlemek için store
export const hasUnsavedChanges = atom<boolean>(false);

// Yüklenen resimleri izlemek için store
export const uploadedImages = atom<string[]>([]);

// Mevcut post'ta bulunan (korunan) resimleri izlemek için store
export const protectedImages = atom<string[]>([]);

// Silme işlemi sırasında mı kontrolü
export const isDeletingImages = atom<boolean>(false);

/**
 * Kaydedilmemiş değişiklikleri işaretler
 */
export function markUnsavedChanges(): void {
  hasUnsavedChanges.set(true);
  console.log('Kaydedilmemiş değişiklikler işaretlendi');
}

/**
 * Kaydedilmemiş değişiklikleri sıfırlar
 */
export function resetUnsavedChanges(): void {
  hasUnsavedChanges.set(false);
  console.log('Kaydedilmemiş değişiklikler sıfırlandı');
}

/**
 * Yüklenen bir resmi listeye ekler
 * @param imageUrl Yüklenen resmin URL'si
 */
export function addUploadedImage(imageUrl: string): void {
  const currentImages = uploadedImages.get();
  
  // Eğer resim zaten listede varsa ekleme
  if (currentImages.includes(imageUrl)) {
    console.log(`Resim zaten listede mevcut: ${imageUrl}`);
    return;
  }
  
  uploadedImages.set([...currentImages, imageUrl]);
  console.log(`Yüklenen resim listeye eklendi: ${imageUrl}`);
  console.log(`Toplam yüklenen resim sayısı: ${uploadedImages.get().length}`);
  
  // Resim yüklendiğinde kaydedilmemiş değişiklikleri işaretle
  markUnsavedChanges();
}

/**
 * Korunan resimleri ayarlar (mevcut post'taki resimler)
 * @param images Korunacak resim URL'leri
 */
export function setProtectedImages(images: string[]): void {
  protectedImages.set(images);
  console.log(`${images.length} korunan resim ayarlandı:`, images);
}

/**
 * Korunan resimleri temizler
 */
export function clearProtectedImages(): void {
  protectedImages.set([]);
  console.log('Korunan resimler temizlendi');
}

/**
 * Yüklenen resimleri temizler
 */
export function clearUploadedImages(): void {
  uploadedImages.set([]);
  console.log('Yüklenen resimler temizlendi');
}

/**
 * BunnyCDN'den bir resmi siler
 * @param imageUrl Silinecek resmin URL'si
 * @returns Promise<boolean> Başarılı ise true, değilse false
 */
export async function deleteImageFromBunnyCDN(imageUrl: string): Promise<boolean> {
  try {
    console.log(`BunnyCDN'den resim siliniyor: ${imageUrl}`);
    
    // FormData oluştur
    const formData = new FormData();
    formData.append("imageUrl", imageUrl);
    
    // API'ye istek gönder
    const response = await fetch("/api/delete-image", {
      method: "POST",
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Resim silme hata yanıtı:", errorData);
      return false;
    }
    
    const data = await response.json();
    console.log("Resim silme başarılı, yanıt:", data);
    return true;
  } catch (error) {
    console.error(`Resim silme hatası: ${error.message}`);
    return false;
  }
}

/**
 * Kaydedilmemiş tüm resimleri BunnyCDN'den siler (korunan resimler hariç)
 * @returns Promise<void>
 */
export async function deleteAllUploadedImages(): Promise<void> {
  try {
    // Silme işlemi başladığını işaretle
    isDeletingImages.set(true);
    
    const allImages = uploadedImages.get();
    const protectedImagesList = protectedImages.get();
    
    // Sadece korunan listede olmayan resimleri sil
    const imagesToDelete = allImages.filter(img => !protectedImagesList.includes(img));
    
    if (imagesToDelete.length === 0) {
      console.log('Silinecek resim yok (tüm resimler korunuyor)');
      return;
    }
    
    console.log(`${imagesToDelete.length} resim silinecek (${protectedImagesList.length} resim korunuyor):`, imagesToDelete);
    
    // Tüm resimleri paralel olarak sil
    const deletePromises = imagesToDelete.map(imageUrl => deleteImageFromBunnyCDN(imageUrl));
    const results = await Promise.allSettled(deletePromises);
    
    // Başarılı ve başarısız sonuçları say
    const successful = results.filter(result => result.status === 'fulfilled' && result.value).length;
    const failed = results.length - successful;
    
    console.log(`${successful} resim başarıyla silindi, ${failed} resim silinemedi`);
    
    // Başarısız olanları göster
    if (failed > 0) {
      results.forEach((result, index) => {
        if (result.status === 'rejected' || !(result.value as boolean)) {
          console.error(`Resim silme hatası (${index}):`, result.status === 'rejected' ? result.reason : 'Başarısız', imagesToDelete[index]);
        }
      });
    }
    
    // Resim listesini temizle
    clearUploadedImages();
  } catch (error) {
    console.error(`Resim silme işlemi sırasında hata: ${error.message}`);
  } finally {
    // Silme işlemi bittiğini işaretle
    isDeletingImages.set(false);
  }
}

/**
 * Tarayıcı kapatılmadan önce uyarı gösterme ve resim silme işlevi
 * Bu işlevi bir bileşende kullanmak için:
 * useEffect(() => {
 *   return setupBeforeUnloadWarning();
 * }, []);
 */
export function setupBeforeUnloadWarning(): () => void {
  // Tarayıcı kapatıldığında çağrılacak işlev
  const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
    console.log('beforeunload olayı tetiklendi');
    
    // Yüklenen resimlerin durumunu kontrol et
    const images = uploadedImages.get();
    console.log(`Yüklenen resim sayısı: ${images.length}`, images);
    
    // Kaydedilmemiş değişikliklerin durumunu kontrol et
    const unsavedChangesExist = hasUnsavedChanges.get();
    console.log(`Kaydedilmemiş değişiklikler: ${unsavedChangesExist}`);
    
    // Eğer kaydedilmemiş değişiklikler varsa
    if (unsavedChangesExist) {
      // Kullanıcıya uyarı göster
      const message = "Kaydedilmemiş değişiklikleriniz var. Sayfadan ayrılmak istediğinizden emin misiniz?";
      e.preventDefault();
      e.returnValue = message;
      
      return message;
    }
  };
  
  // Sayfa tamamen yüklendiğinde/kapatıldığında çağrılacak işlev
  const handleUnload = () => {
    console.log('unload olayı tetiklendi - sayfa gerçekten kapatılıyor');
    
    // Kaydedilmemiş değişiklikler varsa ve yüklenen resimler varsa sil
    const unsavedChangesExist = hasUnsavedChanges.get();
    const images = uploadedImages.get();
    
    if (unsavedChangesExist && images.length > 0) {
      try {
        // Silinecek resimleri bir JSON olarak hazırla
        const payload = JSON.stringify({ images });
        
        // sendBeacon API'si tarayıcı tarafından destekleniyorsa kullan
        if (navigator.sendBeacon) {
          console.log('sendBeacon API kullanılıyor (unload)');
          // Blob olarak gönder ve Content-Type başlığını ayarla
          const blob = new Blob([payload], { type: 'application/json' });
          const result = navigator.sendBeacon('/api/delete-unused-images', blob);
          console.log(`${images.length} resim silme isteği gönderildi, sonuç: ${result}`);
        }
      } catch (error) {
        console.error('Resim silme isteği gönderilemedi:', error);
      }
    }
  };
  
  // Sayfa kapatılmadan önce olayı dinle (uyarı için)
  window.addEventListener('beforeunload', handleBeforeUnload);
  
  // Sayfa gerçekten kapatıldığında olayı dinle (resim silme için)
  window.addEventListener('unload', handleUnload);
  
  // Cleanup function
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('unload', handleUnload);
  };
}
