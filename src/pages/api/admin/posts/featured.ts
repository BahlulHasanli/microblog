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

    const { postId, featured } = await context.request.json();

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
      
      // Əgər featured sahəsi varsa, yenilə
      if (content.includes('featured:')) {
        if (featured === true) {
          updatedContent = content.replace(
            /featured:\s*false/,
            "featured: true"
          );
        } else {
          updatedContent = content.replace(
            /featured:\s*true/,
            "featured: false"
          );
        }
      } else {
        // Əgər featured sahəsi yoxdursa, əlavə et
        // approved-dan sonra əlavə edək
        updatedContent = content.replace(
          /(approved:\s*(?:true|false))/,
          `$1\nfeatured: ${featured}`
        );
      }

      // Faylı yenilə
      await fs.writeFile(filePath, updatedContent, "utf-8");

      return new Response(
        JSON.stringify({
          success: true,
          message: featured ? "Post önə çıxarıldı" : "Post önə çıxarmadan çıxarıldı",
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
    console.error("Featured toggle xətası:", error);
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
