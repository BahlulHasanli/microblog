import type { APIRoute } from "astro";
import { requireAdmin } from "@/utils/auth";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export const POST: APIRoute = async (context) => {
  try {
    // Admin yoxlaması
    const adminCheck = await requireAdmin(context);
    if (adminCheck instanceof Response) {
      return adminCheck;
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

    // MDX faylını sil
    const postSlug = slug || postId;
    try {
      const fileName = `${postSlug}.mdx`;
      const filePath = path.join(process.cwd(), "src/content/posts", fileName);
      
      // Faylın mövcudluğunu yoxla
      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
        console.log(`MDX faylı silindi: ${filePath}`);
      } catch (fileError) {
        console.log(`MDX faylı tapılmadı: ${filePath}`);
      }

      // BunnyCDN-dən şəkilləri sil
      try {
        const bunnyApiKey = "a3571a42-cb98-4dce-9b81d75e2c8c-5263-4043";
        const storageZoneName = "the99-storage";
        const hostname = "storage.bunnycdn.com";
        const folder = `notes/${postSlug}`;

        const response = await fetch(
          `https://${hostname}/${storageZoneName}/${folder}/`,
          {
            method: "DELETE",
            headers: {
              AccessKey: bunnyApiKey,
            },
          }
        );

        if (response.ok) {
          console.log(`BunnyCDN klasörü silindi: ${folder}`);
        }
      } catch (cdnError) {
        console.error("BunnyCDN silmə xətası:", cdnError);
      }
    } catch (error) {
      console.error("Fayl silmə xətası:", error);
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
