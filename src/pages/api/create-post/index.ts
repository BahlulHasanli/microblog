import type { APIRoute } from "astro";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { requireAuth } from "../../../utils/auth";
import slugify from "slugify";

export const POST: APIRoute = async (context) => {
  try {
    // Kimlik doğrulama kontrolü
    const user = await requireAuth(context);
    if (!user) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Bu işlem için giriş yapmanız gerekiyor",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Form verilerini al
    const formData = await context.request.formData();
    const title = formData.get("title")?.toString() || "";
    const description = formData.get("description")?.toString() || "";
    const content = formData.get("content")?.toString() || "";
    const categoriesData = formData.getAll("categories").map(c => c.toString());
    // Resim URL'si ve alt metni için varsayılan değerler
    const imageFromForm = formData.get("image")?.toString();
    const imageAltFromForm = formData.get("imageAlt")?.toString();

    // Yüklenen resim dosyasını al
    const uploadedImage = formData.get("uploadedImage") as File | null;

    // Resim URL'si boşsa varsayılan bir değer kullan veya null olarak bırak
    const image =
      imageFromForm && imageFromForm.trim() !== "" ? imageFromForm : "";
    const imageAlt =
      imageAltFromForm && imageAltFromForm.trim() !== ""
        ? imageAltFromForm
        : "";

    // Gerekli alanları kontrol et
    if (!title || !content) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Başlık ve içerik alanları zorunludur",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Tarih oluştur
    const pubDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD formatı

    // Dosya adını oluştur
    const slug = slugify(title, { lower: true, strict: true });
    const fileName = `${slug}.md`;
    const filePath = path.join(process.cwd(), "src/content/posts", fileName);

    // Eğer yüklenen bir resim varsa, kaydet
    if (uploadedImage) {
      try {
        // Resim klasörünü oluştur (yoksa)
        const postsImageDir = path.join(process.cwd(), "public/images/posts");
        await fs.mkdir(postsImageDir, { recursive: true });
        console.log("Resim klasörü:", postsImageDir);

        // Resim dosyasının yolunu oluştur
        const imageFileName = path.basename(image);
        const imagePath = path.join(postsImageDir, imageFileName);
        console.log("Resim dosya yolu:", imagePath);
        console.log("Resim URL'si:", image);
        console.log("Resim dosya adı:", uploadedImage.name);

        try {
          // Resim dosyasının içeriğini al
          const arrayBuffer = await uploadedImage.arrayBuffer();

          // Buffer'a dönüştür ve kaydet
          const buffer = Buffer.from(arrayBuffer);
          await fs.writeFile(imagePath, buffer);
        } catch (bufferError) {
          throw new Error(`Buffer işleme hatası: ${bufferError.message}`);
        }
      } catch (error) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `Resim yükleme sırasında bir hata oluştu: ${error.message}`,
          }),
          { status: 500 }
        );
      }
    } else {
      console.log("Yüklenen resim yok");
    }

    // Markdown içeriği oluştur
    let imageSection = "";
    if (image && image.trim() !== "") {
      imageSection = `image:
  url: "http://localhost:4321${image}"
  alt: "${imageAlt}"
`;
    }

    const categoriesSection =
      categoriesData.length > 0
        ? `categories: [${categoriesData.map((category) => `"${category}"`).join(", ")}]`
        : "";

    const markdown = `---
pubDate: ${pubDate}
author:
  name: ${user.fullName}
  avatar: "https://untitledui.com/images/avatars/loki-bright"
title: "${title}"
description: "${description}"
${imageSection}${categoriesSection}
---

${content}`;

    // Dosyayı oluştur
    await fs.writeFile(filePath, markdown, "utf-8");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Gönderi başarıyla oluşturuldu",
        slug,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Post oluşturma hatası:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: "Gönderi oluşturulurken bir hata oluştu",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
