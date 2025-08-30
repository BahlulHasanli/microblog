/**
 * Metni slug formatına dönüştürür
 * @param text Dönüştürülecek metin
 * @returns Slug formatında metin
 */
export function slugify(text: string): string {
  // Türkçe karakterleri önce dönüştür
  const turkishChars: Record<string, string> = {
    'ç': 'c', 'Ç': 'c',
    'ğ': 'g', 'Ğ': 'g',
    'ı': 'i', 'İ': 'i',
    'ö': 'o', 'Ö': 'o',
    'ş': 's', 'Ş': 's',
    'ü': 'u', 'Ü': 'u',
    'ä': 'a', 'Ä': 'a',
    'â': 'a', 'Â': 'a',
    'î': 'i', 'Î': 'i',
    'û': 'u', 'Û': 'u',
    'ô': 'o', 'Ô': 'o'
  };
  
  let result = text.toString();
  
  // Türkçe karakterleri dönüştür
  for (const [key, value] of Object.entries(turkishChars)) {
    result = result.replace(new RegExp(key, 'g'), value);
  }
  
  return result
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Boşlukları tire ile değiştir
    .replace(/[^a-z0-9\-]+/g, '')   // Sadece a-z, 0-9 ve tire karakterlerini tut
    .replace(/\-\-+/g, '-')         // Birden fazla tireyi tek tireye dönüştür
    .replace(/^-+/, '')             // Baştaki tireleri kaldır
    .replace(/-+$/, '');            // Sondaki tireleri kaldır
}
