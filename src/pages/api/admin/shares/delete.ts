import type { APIRoute } from "astro";
import { supabase } from "@/db/supabase";
import { getUserFromCookies } from "@/utils/auth";

const BUNNY_STORAGE_ZONE = "the99-storage";
const BUNNY_HOSTNAME = "storage.bunnycdn.com";

async function deleteBunnyCDNFolder(
  folderPath: string,
  apiKey: string
): Promise<void> {
  try {
    // Path-i normalize et (sona / əlavə et əgər yoxdursa)
    const normalizedPath = folderPath.endsWith("/")
      ? folderPath
      : `${folderPath}/`;

    console.log(`[BunnyCDN] Folder silinməsi başladı: ${normalizedPath}`);

    const BUNNY_API_KEY = import.meta.env.BUNNY_API_KEY;

    console.log("BUNNY_API_KEY", BUNNY_API_KEY);

    // Əvvəlcə folder içindəki faylları listə
    const listUrl = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${normalizedPath}`;
    console.log(`[BunnyCDN] List URL: ${listUrl}`);

    const listResponse = await fetch(listUrl, {
      method: "GET",
      headers: {
        AccessKey: apiKey,
      },
    });

    console.log(`[BunnyCDN] List response status: ${listResponse.status}`);

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.error(
        `[BunnyCDN] List xətası - Status: ${listResponse.status}, Body: ${errorText}`
      );
      return;
    }

    const files = await listResponse.json();
    console.log(
      `[BunnyCDN] Tapılan fayllar/folderlar: ${JSON.stringify(files)}`
    );

    // Hər bir faylı sil
    if (Array.isArray(files) && files.length > 0) {
      for (const file of files) {
        const filePath = `${normalizedPath}${file.ObjectName}`;
        console.log(
          `[BunnyCDN] Silinən element: ${filePath}, IsDirectory: ${file.IsDirectory}`
        );

        if (file.IsDirectory) {
          // Əgər folder olarsa, recursive silə
          await deleteBunnyCDNFolder(filePath, apiKey);
        } else {
          // Faylı sil
          const deleteUrl = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${filePath}`;
          const deleteResponse = await fetch(deleteUrl, {
            method: "DELETE",
            headers: {
              AccessKey: apiKey,
            },
          });
          console.log(
            `[BunnyCDN] Fayl silindi: ${filePath}, Status: ${deleteResponse.status}`
          );
          if (!deleteResponse.ok) {
            console.error(
              `[BunnyCDN] Fayl silmə xətası: ${filePath}, Status: ${deleteResponse.status}`
            );
          }
        }
      }
    } else {
      console.log(`[BunnyCDN] Folder boşdur: ${normalizedPath}`);
    }

    // Boş folder-i sil
    const deleteFolderUrl = `https://${BUNNY_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${normalizedPath}`;
    console.log(`[BunnyCDN] Folder silinməsi URL: ${deleteFolderUrl}`);

    const deleteFolderResponse = await fetch(deleteFolderUrl, {
      method: "DELETE",
      headers: {
        AccessKey: apiKey,
      },
    });

    console.log(
      `[BunnyCDN] Folder silindi, Status: ${deleteFolderResponse.status}`
    );

    if (!deleteFolderResponse.ok) {
      const errorText = await deleteFolderResponse.text();
      console.error(
        `[BunnyCDN] Folder silmə xətası: ${normalizedPath}, Status: ${deleteFolderResponse.status}, Body: ${errorText}`
      );
    }
  } catch (error) {
    console.error("[BunnyCDN] Folder silmə xətası:", error);
  }
}

export const DELETE: APIRoute = async ({ cookies, request }) => {
  try {
    const user = await getUserFromCookies(cookies, null);

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, message: "Giriş tələb olunur" }),
        { headers: { "Content-Type": "application/json" }, status: 401 }
      );
    }

    const { shareId } = await request.json();

    if (!shareId) {
      return new Response(
        JSON.stringify({ success: false, message: "Paylaşım ID tələb olunur" }),
        { headers: { "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Paylaşımı al - şəkil URL-i olub olmadığını yoxla
    const { data: share, error: fetchError } = await supabase
      .from("shares")
      .select("*")
      .eq("id", shareId)
      .single();

    if (fetchError || !share) {
      return new Response(
        JSON.stringify({ success: false, message: "Paylaşım tapılmadı" }),
        { headers: { "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Bunny CDN-dən shares folderini sil (shares/{shareId}/)
    console.log(`[DELETE API] share.id: ${share.id}`);
    console.log(
      `[DELETE API] BUNNY_API_KEY mövcud: ${import.meta.env.BUNNY_API_KEY}`
    );

    if (share.id && import.meta.env.BUNNY_API_KEY) {
      const shareFolder = `shares/${share.id}`;
      console.log(
        `[DELETE API] Share folder silinməsi başladı: ${shareFolder}`
      );
      await deleteBunnyCDNFolder(shareFolder, import.meta.env.BUNNY_API_KEY);
      console.log(
        `[DELETE API] Share folder silinməsi tamamlandı: ${shareFolder}`
      );
    } else {
      console.warn(
        `[DELETE API] BunnyCDN folder silinməsi atlandı - share.id: ${share.id}, API Key: ${!!import.meta.env.BUNNY_API_KEY}`
      );
    }

    // Paylaşımla bağlı şərhlər sil
    await supabase.from("share_comments").delete().eq("share_id", shareId);

    // Paylaşımla bağlı bəyənmələr sil
    await supabase.from("share_likes").delete().eq("share_id", shareId);

    // // Paylaşımı sil
    const { error: deleteError } = await supabase
      .from("shares")
      .delete()
      .eq("id", shareId);

    if (deleteError) {
      console.error("Share delete error:", deleteError);
      return new Response(
        JSON.stringify({ success: false, message: "Silmə xətası baş verdi" }),
        { headers: { "Content-Type": "application/json" }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Paylaşım silindi" }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Share delete error:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Server xətası" }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
};
