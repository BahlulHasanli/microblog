import type { APIRoute } from "astro";
import { supabase } from "@/db/supabase";

export interface Category {
  id: number;
  slug: string;
  name: string;
  parent_id: number | null;
  sort_order: number;
  children?: Category[];
}

/**
 * Düz kateqoriya siyahısını ağac strukturuna çevirir
 */
function buildCategoryTree(categories: Category[]): Category[] {
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

export const GET: APIRoute = async ({ url }) => {
  try {
    const flat = url.searchParams.get("flat") === "true";

    const { data: categories, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      console.error("Kategoriyalar çəkilərkən xəta:", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Kategoriyalar çəkilə bilmədi",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const allCategories = categories || [];

    return new Response(
      JSON.stringify({
        success: true,
        categories: flat ? allCategories : allCategories,
        tree: flat ? undefined : buildCategoryTree(allCategories),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Kategoriyalar API xətası:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Kategoriyalar çəkilərkən xəta baş verdi",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
