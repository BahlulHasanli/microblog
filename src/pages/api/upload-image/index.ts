import type { APIRoute } from "astro";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { requireAuth } from "../../../utils/auth";

// Dosya yolunu oluştur
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    const file = formData.get("file") as File;
    const fileName = formData.get("fileName")?.toString() || `${Date.now()}.jpg`;

    if (!file) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Dosya bulunamadı" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Resim klasörünü oluştur (yoksa)
    const postsImageDir = path.join(process.cwd(), "public/images/posts");
    await fs.mkdir(postsImageDir, { recursive: true });
    
    // Resim dosyasının yolunu oluştur
    const imagePath = path.join(postsImageDir, fileName);
    
    // Resim dosyasının içeriğini al ve kaydet
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(imagePath, buffer);
    
    // Başarılı yanıt döndür
    return new Response(JSON.stringify({
      success: true,
      message: "Resim başarıyla yüklendi",
      imageUrl: `/images/posts/${fileName}`
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Resim yükleme hatası:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: "Resim yüklenirken bir hata oluştu" 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
