import type { APIRoute } from "astro";
import * as https from "https";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const fileName = formData.get("fileName") as string;
    const filePath = formData.get("filePath") as string;

    if (!file || !fileName) {
      return new Response(
        JSON.stringify({ error: "Dosya veya dosya adı belirtilmedi" }),
        { status: 400 }
      );
    }

    // Geçici dosya oluştur
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, fileName);

    // File içeriğini buffer'a dönüştür
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Geçici dosyaya yaz
    fs.writeFileSync(tempFilePath, buffer);

    // Bunny.net ayarları
    const REGION = "";
    const BASE_HOSTNAME = "storage.bunnycdn.com";
    const HOSTNAME = REGION ? `${REGION}.${BASE_HOSTNAME}` : BASE_HOSTNAME;
    const STORAGE_ZONE_NAME = "the99-storage";
    // API anahtarını düzelttim
    const ACCESS_KEY = "a3571a42-cb98-4dce-9b81d75e2c8c-5263-4043";
    
    // Storage klasör yapısını oluştur
    // Dosya yolu belirtilmişse kullan, yoksa fileName'i kullan
    // Özellikle avatars/ yolu için destek eklenmiştir

    console.log("Bunny CDN yükleme başlıyor:", {
      fileName,
      filePath,
      tempFilePath,
      fileSize: buffer.length,
    });

    // Alternatif yükleme yöntemi - node-fetch kullanarak
    let uploadSuccess = false;
    let errorMessage = "";

    try {
      // Fetch API ile yükleme deneyin
      const targetPath = filePath || fileName;
      // Doğrudan targetPath'i kullan
      const url = `https://${HOSTNAME}/${STORAGE_ZONE_NAME}/${targetPath}`;

      console.log(`Fetch API ile yükleme deneniyor: ${url}`);

      const fetchResponse = await fetch(url, {
        method: "PUT",
        headers: {
          AccessKey: ACCESS_KEY,
          "Content-Type": "application/octet-stream",
          "Content-Length": buffer.length.toString(),
        },
        body: buffer,
      });

      if (fetchResponse.ok) {
        console.log(`Fetch API ile yükleme başarılı: ${fetchResponse.status}`);
        uploadSuccess = true;
      } else {
        const responseText = await fetchResponse.text();
        console.error(
          `Fetch API yükleme hatası: ${fetchResponse.status} - ${responseText}`
        );
        errorMessage = `Fetch API hatası: ${fetchResponse.status}`;
      }
    } catch (fetchError) {
      console.error("Fetch API yükleme hatası:", fetchError);
      errorMessage = `Fetch hatası: ${fetchError.message}`;
    }

    // Eğer fetch başarısız olduysa, geleneksel yöntemi dene
    if (!uploadSuccess) {
      try {
        console.log("Geleneksel yöntem ile yükleme deneniyor...");
        await uploadToBunny(
          tempFilePath,
          filePath || fileName,
          HOSTNAME,
          STORAGE_ZONE_NAME,
          ACCESS_KEY
        );
        uploadSuccess = true;
      } catch (traditionalError) {
        console.error("Geleneksel yükleme hatası:", traditionalError);
        if (!errorMessage) {
          errorMessage = `Geleneksel yükleme hatası: ${traditionalError.message}`;
        }
      }
    }

    if (!uploadSuccess) {
      throw new Error(`Yükleme başarısız: ${errorMessage}`);
    }

    // Geçici dosyayı temizle
    try {
      fs.unlinkSync(tempFilePath);
    } catch (err) {
      console.error("Geçici dosya temizleme hatası:", err);
    }

    // CDN URL'ini oluştur
    const cdnUrl = `https://the99.b-cdn.net/${filePath || fileName}`;
    console.log(`Oluşturulan CDN URL'si: ${cdnUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Resim başarıyla yüklendi",
        imageUrl: cdnUrl,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Bunny CDN yükleme hatası:", error);
    return new Response(
      JSON.stringify({ error: "Resim yükleme işlemi başarısız oldu" }),
      { status: 500 }
    );
  }
};

// Bunny.net'e dosya yükleme fonksiyonu
function uploadToBunny(
  filePath: string,
  targetPath: string,
  hostname: string,
  storageZone: string,
  accessKey: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(filePath);

    // Log isteği
    console.log(`BunnyCDN yükleme başlatılıyor: ${targetPath}`);
    console.log(`Host: ${hostname}, StorageZone: ${storageZone}`);

    const options = {
      method: "PUT",
      host: hostname,
      path: `/${storageZone}/${targetPath}`,
      headers: {
        // Bunny CDN'in beklediği şekilde header'ları düzelttim
        AccessKey: accessKey,
        "Content-Type": "application/octet-stream",
        "Content-Length": fs.statSync(filePath).size,
      },
    };

    console.log("BunnyCDN istek ayarları:", JSON.stringify(options, null, 2));

    const req = https.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk.toString("utf8");
      });

      res.on("end", () => {
        console.log(`BunnyCDN yanıtı: Durum Kodu ${res.statusCode}`);
        console.log(`Yanıt: ${responseData}`);

        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`Dosya başarıyla yüklendi: ${targetPath}`);
          resolve(true);
        } else {
          console.error(
            `BunnyCDN yükleme hatası: ${res.statusCode} - ${responseData}`
          );
          reject(new Error(`HTTP Hata: ${res.statusCode} - ${responseData}`));
        }
      });
    });

    req.on("error", (error) => {
      console.error(`BunnyCDN istek hatası:`, error);
      reject(error);
    });

    // Dosya boyutunu log'la
    const stats = fs.statSync(filePath);
    console.log(`Yüklenen dosya boyutu: ${stats.size} byte`);

    readStream.pipe(req);
  });
}
