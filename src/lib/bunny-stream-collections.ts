/**
 * Bunny Stream kolleksiyaları — siyahı, yaratma, kateqoriya ilə uyğunlaşdırma.
 * @see https://docs.bunny.net/reference/collection_createcollection
 */

const API_BASE = "https://video.bunnycdn.com";

type CollectionItem = { guid?: string; name?: string | null };

type ListCollectionsResponse = { items?: CollectionItem[] | null };

export async function bunnyListCollections(
  apiKey: string,
  libraryId: number,
  search?: string
): Promise<CollectionItem[]> {
  const q = search ? `&search=${encodeURIComponent(search)}` : "";
  const res = await fetch(
    `${API_BASE}/library/${libraryId}/collections?itemsPerPage=100${q}`,
    { headers: { AccessKey: apiKey, Accept: "application/json" } }
  );
  if (!res.ok) {
    console.warn("[bunny-collections] list", res.status, await res.text().catch(() => ""));
    return [];
  }
  const data = (await res.json()) as ListCollectionsResponse;
  return data.items ?? [];
}

function findCollectionGuidByCategory(
  items: CollectionItem[],
  categoryName: string,
  categorySlug: string
): string | null {
  const n = categoryName.trim().toLowerCase();
  const s = categorySlug.trim().toLowerCase();
  for (const it of items) {
    const bn = (it.name ?? "").trim().toLowerCase();
    if (!it.guid) continue;
    if (bn === n || bn === s) return it.guid;
  }
  return null;
}

export async function bunnyCreateCollection(params: {
  apiKey: string;
  libraryId: number;
  name: string;
}): Promise<{ success: true; guid: string } | { success: false; message: string }> {
  const name = params.name.trim();
  if (!name) {
    return { success: false, message: "Kolleksiya adı boş ola bilməz" };
  }

  const res = await fetch(`${API_BASE}/library/${params.libraryId}/collections`, {
    method: "POST",
    headers: {
      AccessKey: params.apiKey,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  const text = await res.text();
  if (!res.ok) {
    return { success: false, message: text || `HTTP ${res.status}` };
  }

  let data: { guid?: string };
  try {
    data = JSON.parse(text) as { guid?: string };
  } catch {
    return { success: false, message: "Bunny kolleksiya cavabı JSON deyil" };
  }

  const guid = data.guid?.trim();
  if (!guid) {
    return { success: false, message: "Bunny kolleksiya guid qaytarmadı" };
  }

  return { success: true, guid };
}

export type CategoryCollectionInput = {
  name: string;
  slug: string;
  /** DB-də saxlanılmış GUID — varsa əvvəlcə istifadə olunur */
  bunnyCollectionGuid?: string | null;
};

/**
 * Keşlənmiş GUID → etibarlı sayılır.
 * Yoxdursa: Bunny-də ad/slug ilə axtarış; tapılmasa yeni kolleksiya (display name = category.name).
 */
export async function resolveOrCreateBunnyCollectionForCategory(params: {
  apiKey: string;
  libraryId: number;
  category: CategoryCollectionInput;
}): Promise<{ success: true; guid: string; created: boolean } | { success: false; message: string }> {
  const { apiKey, libraryId, category } = params;
  const cached = category.bunnyCollectionGuid?.trim();
  if (cached) {
    return { success: true, guid: cached, created: false };
  }

  const name = category.name.trim() || category.slug.trim();
  const slug = category.slug.trim() || name;

  let items = await bunnyListCollections(apiKey, libraryId, name);
  let guid = findCollectionGuidByCategory(items, name, slug);
  if (!guid) {
    items = await bunnyListCollections(apiKey, libraryId, slug);
    guid = findCollectionGuidByCategory(items, name, slug);
  }
  if (!guid) {
    items = await bunnyListCollections(apiKey, libraryId, "");
    guid = findCollectionGuidByCategory(items, name, slug);
  }

  if (guid) {
    return { success: true, guid, created: false };
  }

  const created = await bunnyCreateCollection({ apiKey, libraryId, name });
  if (created.success) {
    return { success: true, guid: created.guid, created: true };
  }

  /* Eyni adda paralel yaradılıbsa və ya Bunny duplicate qaytarıbsa — tam siyahıdan tap */
  items = await bunnyListCollections(apiKey, libraryId, "");
  guid = findCollectionGuidByCategory(items, name, slug);
  if (guid) {
    return { success: true, guid, created: false };
  }

  return { success: false, message: created.message };
}
