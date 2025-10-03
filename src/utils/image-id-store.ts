/**
 * Resim ID'lerini senkronize etmek için kullanılan bir depo
 * Bu sayede hem TipTap editöründe hem de API tarafında aynı resim ID'leri kullanılabilir
 */

// Resim ID'lerini saklamak için bir Map kullanıyoruz
// Key: Geçici resim URL'si veya ID'si
// Value: Oluşturulan UUID
export const imageIdMap = new Map<string, string>();

// Global olarak erişilebilir olması için window nesnesine ekle
declare global {
  interface Window {
    _imageIdMap?: Map<string, string>;
  }
}

// Browser ortamında çalışıyorsa window nesnesine ekle
if (typeof window !== 'undefined') {
  window._imageIdMap = window._imageIdMap || imageIdMap;
}

/**
 * Bir resim için ID oluşturur veya varsa mevcut ID'yi döndürür
 * @param tempId Geçici resim ID'si veya URL'si
 * @param slug Post slug'ı
 * @param fileExtension Dosya uzantısı
 * @returns Oluşturulan veya mevcut resim ID'si
 */
export function getOrCreateImageId(tempId: string, slug: string, fileExtension: string): string {
  // Eğer bu tempId için daha önce bir UUID oluşturulmuşsa onu döndür
  if (imageIdMap.has(tempId)) {
    return imageIdMap.get(tempId)!;
  }
  
  // UUID oluştur
  const uuid = generateUUID().substring(0, 8);
  const imageId = `${slug}-${uuid}.${fileExtension}`;
  
  // Map'e kaydet
  imageIdMap.set(tempId, imageId);
  
  console.log(`Yeni resim ID oluşturuldu: ${tempId} -> ${imageId}`);
  return imageId;
}

/**
 * UUID benzeri rastgele bir ID oluşturur
 * @returns Rastgele oluşturulmuş UUID
 */
export function generateUUID(): string {
  // 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx' formatında UUID oluştur
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Resim ID'lerini temizler
 */
export function clearImageIds(): void {
  imageIdMap.clear();
  console.log('Resim ID deposu temizlendi');
}

/**
 * Geçici resim URL'sinden veya ID'sinden resim ID'sini döndürür
 * @param tempUrlOrId Geçici resim URL'si veya ID'si
 * @returns Resim ID'si veya null
 */
export function getImageId(tempUrlOrId: string): string | null {
  return imageIdMap.get(tempUrlOrId) || null;
}

/**
 * Tüm resim ID'lerini döndürür
 * @returns Resim ID'lerinin bir dizisi
 */
export function getAllImageIds(): [string, string][] {
  return Array.from(imageIdMap.entries());
}
