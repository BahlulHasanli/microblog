/**
 * Metni slug formatına dönüştürür
 * @param text Dönüştürülecek metin
 * @returns Slug formatında metin
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Boşlukları tire ile değiştir
    .replace(/[^\w\-]+/g, '')       // Alfanümerik olmayan karakterleri kaldır
    .replace(/\-\-+/g, '-')         // Birden fazla tireyi tek tireye dönüştür
    .replace(/^-+/, '')             // Baştaki tireleri kaldır
    .replace(/-+$/, '');            // Sondaki tireleri kaldır
}
