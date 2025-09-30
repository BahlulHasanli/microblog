import { atom } from 'nanostores';

// Kaydedilmemiş değişiklikleri izlemek için store
export const hasUnsavedChanges = atom<boolean>(false);

// Yüklenen resimleri izlemek için store
export const uploadedImages = atom<string[]>([]);

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
 * Kaydedilmemiş tüm resimleri BunnyCDN'den siler
 * @returns Promise<void>
 */
export async function deleteAllUploadedImages(): Promise<void> {
  try {
    // Silme işlemi başladığını işaretle
    isDeletingImages.set(true);
    
    const images = uploadedImages.get();
    if (images.length === 0) {
      console.log('Silinecek resim yok');
      return;
    }
    
    console.log(`${images.length} resim silinecek:`, images);
    
    // Tüm resimleri paralel olarak sil
    const deletePromises = images.map(imageUrl => deleteImageFromBunnyCDN(imageUrl));
    const results = await Promise.allSettled(deletePromises);
    
    // Başarılı ve başarısız sonuçları say
    const successful = results.filter(result => result.status === 'fulfilled' && result.value).length;
    const failed = results.length - successful;
    
    console.log(`${successful} resim başarıyla silindi, ${failed} resim silinemedi`);
    
    // Başarısız olanları göster
    if (failed > 0) {
      results.forEach((result, index) => {
        if (result.status === 'rejected' || !(result.value as boolean)) {
          console.error(`Resim silme hatası (${index}):`, result.status === 'rejected' ? result.reason : 'Başarısız', images[index]);
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
      
      // Kaydedilmemiş resimleri silme işlemi başlat
      // Not: beforeunload olayında asenkron işlemler garanti edilmez,
      // bu nedenle sendBeacon API'si kullanıyoruz
      const images = uploadedImages.get();
      if (images.length > 0) {
        try {
          // Silinecek resimleri bir JSON olarak hazırla
          const payload = JSON.stringify({ images });
          
          // sendBeacon API'si tarayıcı tarafından destekleniyorsa kullan
          if (navigator.sendBeacon) {
            console.log('sendBeacon API kullanılıyor');
            // Blob olarak gönder ve Content-Type başlığını ayarla
            const blob = new Blob([payload], { type: 'application/json' });
            const result = navigator.sendBeacon('/api/delete-unused-images', blob);
            console.log(`${images.length} resim silme isteği gönderildi, sonuç: ${result}`);
            
            if (!result) {
              console.error('sendBeacon başarısız oldu, fetch ile tekrar deneniyor');
              // sendBeacon başarısız olduysa fetch ile dene
              fetch('/api/delete-unused-images', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: payload,
                keepalive: true
              }).catch(err => console.error('Fetch hatası:', err));
            }
          } else {
            // sendBeacon desteklenmiyorsa fetch API kullan
            // Not: Bu durumda istek tamamlanmayabilir çünkü sayfa kapatılıyor
            console.warn('sendBeacon API desteklenmiyor, fetch kullanılıyor');
            fetch('/api/delete-unused-images', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: payload,
              // keepalive özelliği sayfa kapatılsa bile isteğin devam etmesini sağlar
              keepalive: true
            }).catch(err => console.error('Fetch hatası:', err));
          }
        } catch (error) {
          console.error('Resim silme isteği gönderilemedi:', error);
        }
      }
      
      return message;
    }
  };
  
  // Sayfa kapatılmadan önce olayı dinle
  window.addEventListener('beforeunload', handleBeforeUnload);
  
  // Cleanup function
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}
