import type { APIRoute } from "astro";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { requireAuth } from "../../../utils/auth";

// Dosya yolunu oluştur
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const postsDir = path.join(__dirname, "../../../../src/content/posts");

export const POST: APIRoute = async (context) => {
  try {
    // Kimlik doğrulama kontrolü
    const user = await requireAuth(context);
    if (!user) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Bu işlem için giriş yapmanız gerekiyor" 
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Form verilerini al
    const formData = await context.request.formData();
    const title = formData.get("title")?.toString() || "";
    const description = formData.get("description")?.toString() || "";
    const content = formData.get("content")?.toString() || "";
    const tags = formData.get("tags")?.toString() || "";
    const image = formData.get("image")?.toString() || "";
    const imageAlt = formData.get("imageAlt")?.toString() || "";
    
    // Gerekli alanları kontrol et
    if (!title || !content) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Başlık ve içerik alanları zorunludur" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Tarih oluştur
    const pubDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD formatı
    
    // Markdown içeriği oluştur
    const markdown = `---
pubDate: ${pubDate}
author:
  name: ${user.fullName}
  avatar: "https://untitledui.com/images/avatars/loki-bright"
title: ${title}
description: "${description}"
image:
  url: "${image}"
  alt: "${imageAlt}"
tags: [${tags.split(",").map(tag => `"${tag.trim()}"`).join(", ")}]
---

${content}`;

    // Dosya adı oluştur (başlıktan slug oluştur)
    const slug = title
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, "-");
    
    // Dosya yolunu oluştur
    const filePath = path.join(postsDir, `${slug}.md`);
    
    // Dosyayı oluştur
    await fs.writeFile(filePath, markdown, "utf-8");
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: "Gönderi başarıyla oluşturuldu",
      slug 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error("Post oluşturma hatası:", error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      message: "Gönderi oluşturulurken bir hata oluştu" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
