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

    const { postId, approve } = await context.request.json();

    if (!postId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Post ID tələb olunur",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // MDX faylını oxu
    const fileName = `${postId}.mdx`;
    const filePath = path.join(process.cwd(), "src/content/posts", fileName);

    try {
      const content = await fs.readFile(filePath, "utf-8");
      
      let updatedContent;
      if (approve === false) {
        // approved: true-nu approved: false ilə əvəz et
        updatedContent = content.replace(
          /approved:\s*true/,
          "approved: false"
        );
      } else {
        // approved: false-u approved: true ilə əvəz et
        updatedContent = content.replace(
          /approved:\s*false/,
          "approved: true"
        );
      }

      // Faylı yenilə
      await fs.writeFile(filePath, updatedContent, "utf-8");

      return new Response(
        JSON.stringify({
          success: true,
          message: approve === false ? "Post yayımdan çıxarıldı" : "Post uğurla təsdiq edildi",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (fileError) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Post faylı tapılmadı",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Post təsdiq xətası:", error);
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
