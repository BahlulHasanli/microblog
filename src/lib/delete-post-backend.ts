import { supabaseAdmin } from "@/db/supabase";

const BUNNY_HOSTNAME = "storage.bunnycdn.com";
const BUNNY_STORAGE_ZONE = "the99-storage";

async function deleteBunnyCDNFolder(
  folderPath: string,
  apiKey: string,
): Promise<void> {
  try {
    const normalizedPath = folderPath.endsWith("/")
      ? folderPath
      : `${folderPath}/`;

    const listUrl = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${normalizedPath}`;
    const listResponse = await fetch(listUrl, {
      method: "GET",
      headers: { AccessKey: apiKey },
    });

    if (!listResponse.ok) {
      if (listResponse.status === 404) return;
      return;
    }

    const files = await listResponse.json();
    if (Array.isArray(files) && files.length > 0) {
      for (const file of files) {
        const filePath = `${normalizedPath}${file.ObjectName}`;
        if (file.IsDirectory) {
          await deleteBunnyCDNFolder(filePath, apiKey);
        } else {
          const deleteUrl = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${filePath}`;
          await fetch(deleteUrl, {
            method: "DELETE",
            headers: { AccessKey: apiKey },
          });
        }
      }
    }

    const deleteFolderUrl = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${normalizedPath}`;
    await fetch(deleteFolderUrl, {
      method: "DELETE",
      headers: { AccessKey: apiKey },
    });
  } catch (error) {
    console.error("[BunnyCDN] Folder silmə xətası:", error);
  }
}

/**
 * Post sətirini (slug əsasında) və Bunny-də `posts/{slug}` aktivlərini silir.
 */
export async function deletePostBySlug(slug: string): Promise<{
  ok: boolean;
  message?: string;
}> {
  if (!slug?.trim()) {
    return { ok: false, message: "Slug tələb olunur" };
  }

  const { error: deleteError } = await supabaseAdmin
    .from("posts")
    .delete()
    .eq("slug", slug.trim());

  if (deleteError) {
    console.error("Supabase delete xətası:", deleteError);
    return {
      ok: false,
      message:
        deleteError.message?.includes("0 rows") || deleteError.code === "PGRST116"
          ? "Post tapılmadı"
          : "Post silinə bilmədi",
    };
  }

  const bunnyKey = import.meta.env.BUNNY_API_KEY as string | undefined;

  if (bunnyKey) {
    try {
      await deleteBunnyCDNFolder(`posts/${slug.trim()}`, bunnyKey);
    } catch (cdnError) {
      console.error("BunnyCDN silmə xətası:", cdnError);
    }
  }

  return { ok: true };
}
