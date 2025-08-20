// Standart kategoriler
export const categories = [
  "Oyun",
  "Qan, Tər və Piksellər",
  "Film & Serial",
  "Animasya",
  "Anime & Manga",
  "Comics",
  "NBA",
  "Podcast",
];

// Kategori slug oluşturma fonksiyonu
export function slugifyCategory(category: string): string {
  return category
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
