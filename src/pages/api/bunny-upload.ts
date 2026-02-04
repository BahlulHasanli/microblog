import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    // Farklı senaryolar için parametreler
    const uploadType = (formData.get("uploadType") as string) || "general"; // general, post-image, avatar, etc.
    const slug = formData.get("slug") as string;
    const tempId = formData.get("tempId") as string;
    const fileName = formData.get("fileName") as string;
    const filePath = formData.get("filePath") as string;

    // Dosya kontrolü
    if (!file) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Dosya belirtilmedi",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Yükleme türüne göre gerekli parametreleri kontrol et
    if (uploadType === "post-image" && !slug) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Post resmi yüklemesi için slug zorunludur",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Dosya formatını tespit et
    const fileExtension = file.name.split(".").pop() || "jpg";

    // Yükleme türüne göre dosya adı ve yolu oluştur
    let finalFileName: string;
    let finalFilePath: string;

    if (uploadType === "post-image") {
      // Post resmi için benzersiz bir dosya adı oluştur
      const uuid = generateUUID().substring(0, 8);
      finalFileName = `${slug}-${uuid}.${fileExtension}`;
      finalFilePath = `posts/${slug}/images/${finalFileName}`;
      console.log(`Post resmi yükleniyor: ${finalFileName}, slug: ${slug}`);
    } else if (uploadType === "post-audio") {
      // Audio faylı üçün post-a özəl qovluq + audio subfolder
      // Client-dən `path` parametri gələ bilər: posts/[slug]
      const customPath = formData.get("path") as string;
      // UUID əlavə edirik ki, eyni adlı fayllar üst-üstə düşməsin
      const uuid = generateUUID().substring(0, 8);
      finalFileName = `${slug}-audio-${uuid}.${fileExtension}`;
      
      if (customPath) {
        // Əgər path varsa, sonuna /audio əlavə et (əgər yoxdursa)
        const basePath = customPath.endsWith('/') ? customPath.slice(0, -1) : customPath;
        finalFilePath = `${basePath}/audio/${finalFileName}`;
      } else {
        finalFilePath = `posts/${slug}/audio/${finalFileName}`;
      }
      console.log(`Post audio yüklənir: ${finalFileName}, path: ${finalFilePath}`);
    } else if (uploadType === "avatar") {
      // Avatar için dosya adı oluştur
      const userId = formData.get("userId") as string;
      finalFileName = `${userId}-${Date.now()}.${fileExtension}`;
      finalFilePath = `avatar/${finalFileName}`;
      console.log(`Avatar yükleniyor: ${finalFileName}, userId: ${userId}`);
    } else {
      // Genel dosya yükleme için
      finalFileName =
        fileName ||
        `${Date.now()}-${Math.floor(Math.random() * 10000)}.${fileExtension}`;
      finalFilePath = filePath || finalFileName;
      console.log(`Genel dosya yükleniyor: ${finalFileName}`);
    }

    // File içeriğini arrayBuffer'a dönüştür
    const arrayBuffer = await file.arrayBuffer();

    // Bunny.net ayarları
    const REGION = "";
    const BASE_HOSTNAME = "storage.bunnycdn.com";
    const HOSTNAME = REGION ? `${REGION}.${BASE_HOSTNAME}` : BASE_HOSTNAME;
    const STORAGE_ZONE_NAME = "the99-storage";

    // API anahtarı - BunnyCDN Storage API anahtarı
    // Önemli: Bu anahtarı BunnyCDN kontrol panelinden almalısınız
    // Storage > [Storage Zone Adı] > FTP & API Access > Storage API Password
    // Cloudflare üçün runtime.env, lokal üçün import.meta.env
    const runtime = (locals as any).runtime;
    const ACCESS_KEY =
      runtime?.env?.BUNNY_API_KEY || import.meta.env.BUNNY_API_KEY;

    console.log("BUNNY_API_KEY mövcuddur:", !!ACCESS_KEY);

    if (!ACCESS_KEY) {
      console.error("BUNNY_API_KEY environment variable tapılmadı");
      return new Response(
        JSON.stringify({
          success: false,
          message: "Server konfiqurasiya xətası: BUNNY_API_KEY təyin edilməyib",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("BunnyCDN ayarları:", {
      hostname: HOSTNAME,
      storageZone: STORAGE_ZONE_NAME,
      apiKeyLength: ACCESS_KEY.length,
    });

    // Storage klasör yapısını oluştur
    // Dosya yolu belirtilmişse kullan, yoksa fileName'i kullan
    // Özellikle avatars/ yolu için destek eklenmiştir

    console.log("Bunny CDN yükleme başlıyor:", {
      fileName,
      filePath,
      fileSize: arrayBuffer.byteLength,
    });

    // Alternatif yükleme yöntemi - node-fetch kullanarak
    let uploadSuccess = false;
    let errorMessage = "";

    try {
      // Önce klasörün var olup olmadığını kontrol et ve yoksa oluştur
      if (finalFilePath && finalFilePath.includes("/")) {
        // Klasör yolunu al
        const folderPath = finalFilePath.substring(
          0,
          finalFilePath.lastIndexOf("/")
        );

        if (folderPath) {
          console.log(`Klasör kontrol ediliyor: ${folderPath}`);

          // Klasörü kontrol et
          const checkFolderResponse = await fetch(
            `https://${HOSTNAME}/${STORAGE_ZONE_NAME}/${folderPath}/`,
            {
              method: "GET",
              headers: {
                AccessKey: ACCESS_KEY,
                Accept: "application/json",
              },
            }
          );

          // Eğer klasör yoksa oluştur (404 dönerse klasör yok demektir)
          if (checkFolderResponse.status === 404) {
            console.log(`Klasör bulunamadı, oluşturuluyor: ${folderPath}`);

            // Klasör oluştur
            const createFolderResponse = await fetch(
              `https://${HOSTNAME}/${STORAGE_ZONE_NAME}/${folderPath}/`,
              {
                method: "PUT",
                headers: {
                  AccessKey: ACCESS_KEY,
                },
              }
            );

            if (!createFolderResponse.ok) {
              console.error(
                `Klasör oluşturma hatası: ${createFolderResponse.status}`
              );
              const errorText = await createFolderResponse.text();
              console.error(`Hata detayı: ${errorText}`);
            } else {
              console.log(`Klasör başarıyla oluşturuldu: ${folderPath}`);
            }
          } else if (checkFolderResponse.ok) {
          }
        }
      }

      // Fetch API ile dosya yükleme
      const url = `https://${HOSTNAME}/${STORAGE_ZONE_NAME}/${finalFilePath}`;

      console.log(`Fetch API ile yükleme deneniyor: ${url}`);
      console.log(`Yüklenen dosya boyutu: ${arrayBuffer.byteLength} byte`);

      const fetchResponse = await fetch(url, {
        method: "PUT",
        headers: {
          AccessKey: ACCESS_KEY,
          "Content-Type": "application/octet-stream",
          "Content-Length": arrayBuffer.byteLength.toString(),
        },
        body: arrayBuffer,
      });

      console.log(
        `Fetch API yanıtı: ${fetchResponse.status} ${fetchResponse.statusText}`
      );

      if (fetchResponse.ok) {
        console.log(`Fetch API ile yükleme başarılı: ${fetchResponse.status}`);
        uploadSuccess = true;

        // Başarılı yanıtı logla
        try {
          const responseText = await fetchResponse.text();
          console.log(`Başarılı yanıt içeriği: ${responseText || "Boş yanıt"}`);
        } catch (e) {
          console.log("Başarılı yanıt içeriği okunamadı");
        }
      } else {
        try {
          const responseText = await fetchResponse.text();
          console.error(
            `Fetch API yükleme hatası: ${fetchResponse.status} ${fetchResponse.statusText} - ${responseText}`
          );
          errorMessage = `Fetch API hatası: ${fetchResponse.status} - ${responseText}`;
        } catch (textError) {
          console.error(
            `Fetch API yükleme hatası: ${fetchResponse.status} ${fetchResponse.statusText} - Yanıt içeriği okunamadı`
          );
          errorMessage = `Fetch API hatası: ${fetchResponse.status} ${fetchResponse.statusText}`;
        }
      }
    } catch (fetchError) {
      console.error("Fetch API yükleme hatası:", fetchError);
      errorMessage = `Fetch hatası: ${fetchError.message}`;
    }

    if (!uploadSuccess) {
      throw new Error(`Yükleme başarısız: ${errorMessage}`);
    }

    // CDN URL'ini oluştur
    const cdnUrl = `https://the99.b-cdn.net/${finalFilePath}`;
    console.log(`Oluşturulan CDN URL'si: ${cdnUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Resim başarıyla yüklendi",
        imageUrl: cdnUrl,
        fileName: finalFileName,
        tempId: tempId,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Bunny CDN yükleme hatası:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: `Resim yükleme işlemi başarısız oldu: ${error.message}`,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

/**
 * UUID benzeri rastgele bir ID oluşturur
 * @returns Rastgele oluşturulmuş UUID
 */
function generateUUID(): string {
  // 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx' formatında UUID oluştur
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
