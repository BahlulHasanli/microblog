import type { APIRoute } from "astro";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { requireAuth } from "../../../utils/auth";
import { getEntry } from "astro:content";
import { slugify } from "../../../utils/slugify";

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
    const slug = formData.get("slug")?.toString() || "";
    const title = formData.get("title")?.toString() || "";
    const authorFullname: any = formData.get("author.fullname")?.toString() || "";
    const authorAvatar: any = formData.get("author.avatar")?.toString() || "";
    const authorUsername: any = formData.get("author.username")?.toString() || "";
    const description = formData.get("description")?.toString() || "";
    const content = formData.get("content")?.toString() || "";
    const categoriesData = formData.getAll("categories").map((c) => c.toString());
    const imageAltFromForm = formData.get("imageAlt")?.toString();
    const existingImageUrl = formData.get("existingImageUrl")?.toString() || "";

    // Yüklenen resim dosyasını al
    const uploadedImage = formData.get("uploadedImage") as File | null;

    const imageAlt = imageAltFromForm && imageAltFromForm.trim() !== "" ? imageAltFromForm : "";

    // Gerekli alanları kontrol et
    if (!title || !content || !slug) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Başlık, içerik ve slug alanları zorunludur",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Mevcut gönderiyi kontrol et
    const entry = await getEntry("posts", slug);
    if (!entry) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Düzenlenecek gönderi bulunamadı",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Orijinal yayın tarihini koru
    const pubDate = entry.data.pubDate || new Date().toISOString().split("T")[0];

    // Dosya yolunu oluştur
    const fileName = `${slug}.mdx`;
    const filePath = path.join(process.cwd(), "src/content/posts", fileName);

    // Eğer yüklenen bir resim varsa, Bunny CDN'e yükle
    let coverImageUrl = existingImageUrl;
    if (uploadedImage) {
      try {
        // Resim dosyasının adını oluştur - içerik resimleriyle aynı format
        const fileExtension = uploadedImage.name.split(".").pop() || "jpg";
        const imageFileName = `${slug}-cover.${fileExtension}`;

        // Bunny CDN klasör yapısı - içerik resimleriyle aynı klasörü kullan
        const folder = `notes/${slug}/images`;

        console.log("Bunny CDN klasör yapısı:", folder);
        console.log("Resim dosya adı:", imageFileName);

        try {
          // Resim dosyasının içeriğini al
          const arrayBuffer = await uploadedImage.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Bunny CDN'e yükleme yap
          const bunnyApiKey = "a3571a42-cb98-4dce-9b81d75e2c8c-5263-4043";
          const storageZoneName = "the99-storage";
          const hostname = "storage.bunnycdn.com";

          // Tam dosya yolu
          const filePath = `${folder}/${imageFileName}`;

          // Fetch API ile yükleme yap
          const response = await fetch(
            `https://${hostname}/${storageZoneName}/${filePath}`,
            {
              method: "PUT",
              headers: {
                AccessKey: bunnyApiKey,
                "Content-Type": "application/octet-stream",
              },
              body: buffer,
            }
          );

          if (!response.ok) {
            throw new Error(`Bunny CDN yükleme hatası: ${response.statusText}`);
          }

          // Başarılı yükleme sonrası CDN URL'sini oluştur
          coverImageUrl = `https://the99.b-cdn.net/${folder}/${imageFileName}`;
          console.log("Bunny CDN'e yüklendi, URL:", coverImageUrl);
        } catch (uploadError) {
          throw new Error(`Bunny CDN yükleme hatası: ${uploadError.message}`);
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
    }

    // Mevcut içerikteki resimleri kontrol et ve silinenleri tespit et
    try {
      // Mevcut gönderiyi oku
      const fileName = `${slug}.mdx`;
      const filePath = path.join(process.cwd(), "src/content/posts", fileName);
      const existingContent = await fs.readFile(filePath, "utf-8");
      
      // Mevcut içerikteki tüm resimleri bul
      const existingImageRegex = /!\[.*?\]\((https:\/\/the99\.b-cdn\.net\/notes\/.*?)\)/g;
      const existingImages = [];
      let match;
      
      while ((match = existingImageRegex.exec(existingContent)) !== null) {
        existingImages.push(match[1]);
      }
      
      // Yeni içerikteki resimleri bul
      const newImageRegex = /!\[.*?\]\((https:\/\/the99\.b-cdn\.net\/notes\/.*?)\)/g;
      const newImages = [];
      
      while ((match = newImageRegex.exec(content)) !== null) {
        newImages.push(match[1]);
      }
      
      // Silinmiş resimleri bul
      const deletedImages = existingImages.filter(img => !newImages.includes(img));
      
      // Silinmiş resimleri BunnyCDN'den kaldır
      for (const imageUrl of deletedImages) {
        try {
          // URL'den dosya yolunu çıkar
          const cdnPrefix = "https://the99.b-cdn.net/";
          const filePath = imageUrl.replace(cdnPrefix, "");
          
          // BunnyCDN API bilgileri
          const bunnyApiKey = "a3571a42-cb98-4dce-9b81d75e2c8c-5263-4043";
          const storageZoneName = "the99-storage";
          const hostname = "storage.bunnycdn.com";
          
          // Dosyayı sil
          const response = await fetch(
            `https://${hostname}/${storageZoneName}/${filePath}`,
            {
              method: "DELETE",
              headers: {
                AccessKey: bunnyApiKey,
              },
            }
          );
          
          if (response.ok) {
            console.log(`Resim başarıyla silindi: ${imageUrl}`);
          } else {
            console.error(`Resim silinirken hata oluştu: ${imageUrl}`, await response.text());
          }
        } catch (error) {
          console.error(`Resim silinirken hata oluştu: ${imageUrl}`, error);
        }
      }
    } catch (error) {
      console.error("Resim silme işlemi sırasında hata oluştu:", error);
    }
    
    // İçerikteki geçici resimleri CDN URL'leriyle değiştir
    let processedContent = content;

    // Blob URL'lerini bul ve değiştir - format bilgisini de içeren regex
    const blobUrlRegex = /blob:http:\/\/localhost:4321\/[a-zA-Z0-9-]+#temp-[0-9]+-[a-z]+/g;
    const blobUrls = content.match(blobUrlRegex) || [];

    // Global resim sayacını başlat
    if (!global._imageCounters) {
      global._imageCounters = {};
    }
    if (!global._imageCounters[slug]) {
      // Mevcut resimlerin sayısını bul
      try {
        const folderPath = `notes/${slug}/images`;
        const bunnyApiKey = "a3571a42-cb98-4dce-9b81d75e2c8c-5263-4043";
        const storageZoneName = "the99-storage";
        const hostname = "storage.bunnycdn.com";

        // Klasör içeriğini kontrol et
        const response = await fetch(
          `https://${hostname}/${storageZoneName}/${folderPath}/`,
          {
            method: "GET",
            headers: {
              AccessKey: bunnyApiKey,
              Accept: "application/json",
            },
          }
        );

        if (response.ok) {
          const files = await response.json();
          // Slug ile başlayan ve .jpg, .png, .gif vb. uzantılı dosyaları say
          const imageFiles = files.filter((file: any) => 
            file.ObjectName.startsWith(slug) && 
            /\.(jpg|jpeg|png|gif|webp)$/i.test(file.ObjectName)
          );
          global._imageCounters[slug] = imageFiles.length;
        } else {
          // Klasör bulunamadıysa veya başka bir hata varsa, sayacı sıfırla
          global._imageCounters[slug] = 0;
        }
      } catch (error) {
        console.error("BunnyCDN klasör kontrolü hatası:", error);
        global._imageCounters[slug] = 0;
      }
    }

    for (const blobUrl of blobUrls) {
      try {
        // Temp ID'yi al
        const tempId = blobUrl.split("#")[1];

        if (!tempId) continue;

        // Resim sayacını artır (her post için benzersiz numaralar)
        global._imageCounters[slug] += 1;

        // Dosya formatını tespit et
        const formatMatch = tempId.match(/temp-[0-9]+-([a-z]+)/);
        const fileExtension = formatMatch && formatMatch[1] ? formatMatch[1] : "png";

        // Resim adını oluştur: slug-1.png formatında
        const imageFileName = `${slug}-${global._imageCounters[slug]}.${fileExtension}`;
        const cdnUrl = `https://the99.b-cdn.net/notes/${slug}/images/${imageFileName}`;

        // İçerikteki URL'yi değiştir
        processedContent = processedContent.replace(blobUrl, cdnUrl);

        console.log(`Geçici resim URL'si değiştirildi: ${blobUrl} -> ${cdnUrl}`);
      } catch (error) {
        console.error(`Resim URL'si düzeltilemedi: ${blobUrl}`, error);
      }
    }

    // Markdown içeriği oluştur
    let imageSection = "";
    if (coverImageUrl) {
      imageSection = `image:
  url: "${coverImageUrl}"
  alt: "${imageAlt || title}"
`;
    }

    const categoriesSection =
      categoriesData.length > 0
        ? `categories: [${categoriesData.map((category) => `"${category}"`).join(", ")}]`
        : "";

    const markdown = `---
pubDate: ${pubDate}
author: 
  name: "${authorFullname}"
  avatar: "${authorAvatar}"
title: "${title}"
description: "${description}"
${imageSection}${categoriesSection}
---

${processedContent}`;

    // Dosyayı güncelle
    await fs.writeFile(filePath, markdown, "utf-8");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Gönderi başarıyla güncellendi",
        slug,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Post güncelleme hatası:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: "Gönderi güncellenirken bir hata oluştu",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
