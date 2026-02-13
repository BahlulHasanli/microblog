export interface Category {
  id: number;
  slug: string;
  name: string;
  parent_id: number | null;
  sort_order?: number;
  children?: Category[];
}

/**
 * Düz kateqoriya siyahısını ağac strukturuna çevirir
 */
export function buildCategoryTree(categories: Category[]): Category[] {
  const map = new Map<number, Category>();
  const roots: Category[] = [];

  // Map-ə əlavə et
  categories.forEach((cat) => {
    map.set(cat.id, { ...cat, children: [] });
  });

  // Ağac strukturu qur
  categories.forEach((cat) => {
    const node = map.get(cat.id)!;
    if (cat.parent_id && map.has(cat.parent_id)) {
      map.get(cat.parent_id)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

/**
 * Kateqoriyanın tam yolunu (breadcrumb) qaytarır
 * Məsələn: ["Tədbirlər", "State of Play"]
 */
export function getCategoryBreadcrumb(
  categories: Category[],
  targetSlug: string,
): Category[] {
  const path: Category[] = [];

  function findPath(slug: string): boolean {
    const cat = categories.find((c) => c.slug === slug);
    if (!cat) return false;

    path.unshift(cat);

    if (cat.parent_id) {
      const parent = categories.find((c) => c.id === cat.parent_id);
      if (parent) {
        return findPath(parent.slug);
      }
    }

    return true;
  }

  findPath(targetSlug);
  return path;
}

/**
 * Bir kateqoriyanın bütün alt kateqoriya slug-larını qaytarır
 */
export function getAllChildSlugs(
  categories: Category[],
  parentSlug: string,
): string[] {
  const slugs: string[] = [];
  const parent = categories.find((c) => c.slug === parentSlug);
  if (!parent) return slugs;

  function collectChildren(parentId: number) {
    categories
      .filter((c) => c.parent_id === parentId)
      .forEach((child) => {
        slugs.push(child.slug);
        collectChildren(child.id);
      });
  }

  collectChildren(parent.id);
  return slugs;
}

/**
 * Bir kateqoriyanın birbaşa uşaqlarını qaytarır
 */
export function getDirectChildren(
  categories: Category[],
  parentSlug: string,
): Category[] {
  const parent = categories.find((c) => c.slug === parentSlug);
  if (!parent) return [];
  return categories.filter((c) => c.parent_id === parent.id);
}

/**
 * Kateqoriyanın parent-ini qaytarır
 */
export function getParentCategory(
  categories: Category[],
  childSlug: string,
): Category | null {
  const child = categories.find((c) => c.slug === childSlug);
  if (!child || !child.parent_id) return null;
  return categories.find((c) => c.id === child.parent_id) || null;
}

/**
 * Kateqoriyaları parent_id-yə görə qruplaşdırır
 */
export function groupCategoriesByParent(
  categories: Category[],
): Map<number | null, Category[]> {
  const groups = new Map<number | null, Category[]>();

  categories.forEach((cat) => {
    const key = cat.parent_id;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(cat);
  });

  return groups;
}
