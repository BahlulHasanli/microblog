export const categories = [
  {
    slug: "oyun",
    name: "Oyun",
  },
  {
    slug: "art",
    name: "Art",
  },
  {
    slug: "qan-ter-piksellər",
    name: "Qan, Tər və Piksellər",
  },
  {
    slug: "film-serial",
    name: "Film & Serial",
  },
  {
    slug: "qorxu",
    name: "Qorxu",
  },
  {
    slug: "animasiya",
    name: "Animasiya",
  },
  {
    slug: "anime-manga",
    name: "Anime & Manga",
  },
  {
    slug: "comics",
    name: "Comics",
  },
  {
    slug: "nba",
    name: "NBA",
  },
  {
    slug: "podcast",
    name: "Podcast",
  },
];

export function slugifyCategory(categoryNameOrSlug: string): string {
  // First check if this is already a slug in our categories array
  const categoryObj = categories.find(cat => cat.slug === categoryNameOrSlug || cat.name === categoryNameOrSlug);
  
  // If it's a known category, return its slug
  if (categoryObj) {
    return categoryObj.slug;
  }
  
  // Otherwise, create a new slug from the string
  return categoryNameOrSlug
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
