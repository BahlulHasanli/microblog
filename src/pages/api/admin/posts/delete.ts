import type { APIRoute } from "astro";
import { requireModerator } from "@/utils/auth";
import { supabaseAdmin } from "@/db/supabase";

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
      // Folder mövcud deyilsə, xəta qeyd et amma davam et
      if (listResponse.status === 404) {
        console.log(`[BunnyCDN] Folder artıq mövcud deyil: ${normalizedPath}`);
        return;
      }
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
      // Xətaya baxmayaraq davam et, çünki fayllar artıq silinib
    }
  } catch (error) {
    console.error("[BunnyCDN] Folder silmə xətası:", error);
  }
}

export const POST: APIRoute = async (context) => {
  try {
    // Moderator yoxlaması (admin və moderator)
    const modCheck = await requireModerator(context);
    if (modCheck instanceof Response) {
      return modCheck;
    }

    const { postId, slug } = await context.request.json();

    if (!postId && !slug) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Post ID və ya slug tələb olunur",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const postSlug = slug || postId;

    // Supabase-dən postu sil
    const { error: deleteError } = await supabaseAdmin
      .from("posts")
      .delete()
      .eq("slug", postSlug);

    if (deleteError) {
      console.error("Supabase delete xətası:", deleteError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Post silinə bilmədi",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // BunnyCDN-dən şəkilləri sil
    if (import.meta.env.BUNNY_API_KEY) {
      try {
        const folder = `posts/${postSlug}`;
        console.log(`[DELETE API] Post folder silinməsi başladı: ${folder}`);
        await deleteBunnyCDNFolder(folder, import.meta.env.BUNNY_API_KEY);
        console.log(`[DELETE API] Post folder silinməsi tamamlandı: ${folder}`);
      } catch (cdnError) {
        console.error("BunnyCDN silmə xətası:", cdnError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Post uğurla silindi",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Post silmə xətası:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Xəta baş verdi",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
