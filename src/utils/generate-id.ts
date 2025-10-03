/**
 * UUID benzeri rastgele bir ID oluşturur
 * @returns Rastgele oluşturulmuş ID
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
 * Daha kısa, dosya adı için uygun rastgele bir ID oluşturur
 * @returns Rastgele oluşturulmuş kısa ID
 */
export function generateShortId(): string {
  // Rastgele 8 karakterlik bir ID oluştur
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Dosya adı için uygun, timestamp içeren rastgele bir ID oluşturur
 * @param extension Dosya uzantısı (örn. 'jpg', 'png')
 * @returns Timestamp ve rastgele değer içeren dosya adı
 */
export function generateFileId(extension: string = 'jpg'): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${timestamp}-${random}.${extension}`;
}
