import type { APIRoute } from "astro";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { requireAuth } from "../../../utils/auth";
import { getEntry } from "astro:content";
import { slugify } from "../../../utils/slugify";
import { categories as CATEGORIES } from "../../../data/categories";

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
    const oldSlug = formData.get("slug")?.toString() || "";
    const title = formData.get("title")?.toString() || "";
    
    // Yeni slug yaradırıq (başlıq dəyişibsə)
    const newSlug = slugify(title);
    const authorFullname: any =
      formData.get("author.fullname")?.toString() || "";
    const authorAvatar: any = formData.get("author.avatar")?.toString() || "";
    const authorUsername: any =
      formData.get("author.username")?.toString() || "";
    const description = formData.get("description") as string;
    const content = formData.get("content") as string;
    // Kategorileri al ve virgülle ayrılmış stringleri ayır
    const categoriesRaw = formData.getAll("categories").map((c) => c.toString());
    
    // Virgülle ayrılmış kategorileri ayır ve tekrar eden kategorileri kaldır
    const categoriesData = [...new Set(
      categoriesRaw.flatMap(category => 
        category.includes(',') ? category.split(',').map(c => c.trim()) : [category.trim()]
      )
    )].filter(Boolean);
    const existingImageUrl = formData.get("existingImageUrl") as string;
    const imageAlt = formData.get("imageAlt") as string || title;
    const uploadedImage = formData.get("uploadedImage") as File;

    // Resim ID'lerini al
    let imageIdMap: Record<string, string> = {};
    const imageIdMapJson = formData.get("imageIdMap") as string;
    if (imageIdMapJson) {
      try {
        imageIdMap = JSON.parse(imageIdMapJson);
        console.log("API: Resim ID'leri alındı:", imageIdMap);
      } catch (error) {
        console.error("API: Resim ID'leri JSON parse hatası:", error);
      }
    }

    // Gerekli alanları kontrol et
    if (!title || !content || !oldSlug) {
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
    const entry = await getEntry("posts", oldSlug);
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
    const pubDate = new Date().toISOString().split("T")[0];

    // BunnyCDN məlumatları
    const bunnyApiKey = "6e7c0a7f-0e8b-4b8c-8f4d-a3571a42cb984dce9b81d75e2c8c52634043";
    const storageZoneName = "the99-storage";
    const hostname = "storage.bunnycdn.com";

    // Əgər slug dəyişibsə, BunnyCDN-də folder-i yenidən adlandırmalıyıq
    if (oldSlug !== newSlug) {
      console.log(`Slug dəyişdi: ${oldSlug} -> ${newSlug}`);
      
      try {
        const oldFolder = `notes/${oldSlug}`;
        const newFolder = `notes/${newSlug}`;
        
        // Köhnə folder-in mövcudluğunu yoxla
        const checkOldFolderResponse = await fetch(
          `https://${hostname}/${storageZoneName}/${oldFolder}/`,
          {
            method: "GET",
            headers: {
              AccessKey: bunnyApiKey,
              Accept: "application/json",
            },
          }
        );
        
        if (checkOldFolderResponse.ok) {
          console.log(`Köhnə folder tapıldı: ${oldFolder}`);
          
          // Köhnə folder-dəki bütün faylları al
          const oldFiles = await checkOldFolderResponse.json();
          
          // Yeni folder yarat
          const createNewFolderResponse = await fetch(
            `https://${hostname}/${storageZoneName}/${newFolder}/images/`,
            {
              method: "PUT",
              headers: {
                AccessKey: bunnyApiKey,
              },
            }
          );
          
          if (createNewFolderResponse.ok || createNewFolderResponse.status === 201) {
            console.log(`Yeni folder yaradıldı: ${newFolder}/images`);
            
            // images folder-indəki faylları köçür
            const imagesFolder = oldFiles.find((f: any) => f.ObjectName === "images" && f.IsDirectory);
            
            if (imagesFolder) {
              // images folder-inin içindəki faylları al
              const getImagesResponse = await fetch(
                `https://${hostname}/${storageZoneName}/${oldFolder}/images/`,
                {
                  method: "GET",
                  headers: {
                    AccessKey: bunnyApiKey,
                    Accept: "application/json",
                  },
                }
              );
              
              if (getImagesResponse.ok) {
                const imageFiles = await getImagesResponse.json();
                
                // Hər bir faylı yeni folder-ə köçür
                for (const file of imageFiles) {
                  if (!file.IsDirectory) {
                    try {
                      // Faylı yüklə
                      const downloadResponse = await fetch(
                        `https://${hostname}/${storageZoneName}/${oldFolder}/images/${file.ObjectName}`,
                        {
                          method: "GET",
                          headers: {
                            AccessKey: bunnyApiKey,
                          },
                        }
                      );
                      
                      if (downloadResponse.ok) {
                        const fileBuffer = await downloadResponse.arrayBuffer();
                        
                        // Fayl adını yenilə (əgər slug ilə başlayırsa)
                        let newFileName = file.ObjectName;
                        if (file.ObjectName.startsWith(oldSlug)) {
                          newFileName = file.ObjectName.replace(oldSlug, newSlug);
                        }
                        
                        // Yeni folder-ə yüklə
                        const uploadResponse = await fetch(
                          `https://${hostname}/${storageZoneName}/${newFolder}/images/${newFileName}`,
                          {
                            method: "PUT",
                            headers: {
                              AccessKey: bunnyApiKey,
                              "Content-Type": "application/octet-stream",
                            },
                            body: fileBuffer,
                          }
                        );
                        
                        if (uploadResponse.ok) {
                          console.log(`Fayl köçürüldü: ${file.ObjectName} -> ${newFileName}`);
                        } else {
                          console.error(`Fayl köçürülə bilmədi: ${file.ObjectName}`);
                        }
                      }
                    } catch (fileError) {
                      console.error(`Fayl köçürmə xətası: ${file.ObjectName}`, fileError);
                    }
                  }
                }
                
                // Köhnə folder-i sil
                try {
                  // Əvvəlcə images folder-indəki faylları sil
                  for (const file of imageFiles) {
                    if (!file.IsDirectory) {
                      await fetch(
                        `https://${hostname}/${storageZoneName}/${oldFolder}/images/${file.ObjectName}`,
                        {
                          method: "DELETE",
                          headers: {
                            AccessKey: bunnyApiKey,
                          },
                        }
                      );
                    }
                  }
                  
                  // images folder-i sil
                  await fetch(
                    `https://${hostname}/${storageZoneName}/${oldFolder}/images/`,
                    {
                      method: "DELETE",
                      headers: {
                        AccessKey: bunnyApiKey,
                      },
                    }
                  );
                  
                  // Ana folder-i sil
                  await fetch(
                    `https://${hostname}/${storageZoneName}/${oldFolder}/`,
                    {
                      method: "DELETE",
                      headers: {
                        AccessKey: bunnyApiKey,
                      },
                    }
                  );
                  
                  console.log(`Köhnə folder silindi: ${oldFolder}`);
                } catch (deleteError) {
                  console.error(`Köhnə folder silinə bilmədi: ${oldFolder}`, deleteError);
                }
              }
            }
          }
        } else {
          console.log(`Köhnə folder tapılmadı: ${oldFolder}`);
        }
      } catch (folderMoveError) {
        console.error("Folder köçürmə xətası:", folderMoveError);
      }
    }

    // Dosya yolunu oluştur
    const oldFileName = `${oldSlug}.mdx`;
    const oldFilePath = path.join(process.cwd(), "src/content/posts", oldFileName);
    const newFileName = `${newSlug}.mdx`;
    const newFilePath = path.join(process.cwd(), "src/content/posts", newFileName);

    // Eğer yüklenen bir resim varsa, Bunny CDN'e yükle
    let coverImageUrl = existingImageUrl;
    
    // Əgər slug dəyişibsə və mövcud cover image varsa, URL-i yenilə
    if (oldSlug !== newSlug && coverImageUrl && coverImageUrl.includes(oldSlug)) {
      coverImageUrl = coverImageUrl.replace(`notes/${oldSlug}/`, `notes/${newSlug}/`);
      console.log(`Cover image URL yeniləndi: ${coverImageUrl}`);
    }
    if (uploadedImage) {
      try {
        // Resim dosyasının adını oluştur - içerik resimleriyle aynı format
        const fileExtension = uploadedImage.name.split(".").pop() || "jpg";
        const imageFileName = `${newSlug}-cover.${fileExtension}`;

        // Bunny CDN klasör yapısı - içerik resimleriyle aynı klasörü kullan
        const folder = `notes/${newSlug}/images`;

        console.log("Bunny CDN klasör yapısı:", folder);
        console.log("Resim dosya adı:", imageFileName);

        try {
          // Resim dosyasının içeriğini al
          const arrayBuffer = await uploadedImage.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Tam dosya yolu
          const filePath = `${folder}/${imageFileName}`;
          
          // Önce klasörün var olup olmadığını kontrol et
          console.log(`Klasör kontrol ediliyor: ${folder}`);
          
          try {
            // Klasörü kontrol et
            const checkFolderResponse = await fetch(
              `https://${hostname}/${storageZoneName}/${folder}/`,
              {
                method: "GET",
                headers: {
                  AccessKey: bunnyApiKey,
                  Accept: "application/json",
                },
              }
            );
            
            // Eğer klasör yoksa oluştur (404 dönerse klasör yok demektir)
            if (checkFolderResponse.status === 404) {
              console.log(`Klasör bulunamadı, oluşturuluyor: ${folder}`);
              
              // Klasör oluştur
              const createFolderResponse = await fetch(
                `https://${hostname}/${storageZoneName}/${folder}/`,
                {
                  method: "PUT",
                  headers: {
                    AccessKey: bunnyApiKey,
                  },
                }
              );
              
              if (!createFolderResponse.ok) {
                console.error(`Klasör oluşturma hatası: ${createFolderResponse.status}`);
                const errorText = await createFolderResponse.text();
                console.error(`Hata detayı: ${errorText}`);
              } else {
                console.log(`Klasör başarıyla oluşturuldu: ${folder}`);
              }
            } else if (checkFolderResponse.ok) {
              console.log(`Klasör zaten var: ${folder}`);
            } else {
              console.error(`Klasör kontrol hatası: ${checkFolderResponse.status}`);
            }
          } catch (folderError) {
            console.error(`Klasör işlemi sırasında hata: ${folderError.message}`);
          }

          // Fetch API ile yükleme yap
          console.log(`Dosya yükleniyor: ${filePath}`);
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
            const errorText = await response.text();
            console.error(`Bunny CDN yükleme hatası: ${response.status} - ${errorText}`);
            throw new Error(`Bunny CDN yükleme hatası: ${response.status} - ${response.statusText}`);
          }
          
          console.log(`Dosya başarıyla yüklendi: ${filePath}`);

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
      // Mevcut gönderiyi oku (köhnə slug ilə)
      const fileName = `${oldSlug}.mdx`;
      const filePath = path.join(process.cwd(), "src/content/posts", fileName);
      const existingContent = await fs.readFile(filePath, "utf-8");

      // Mevcut içerikteki tüm resimleri bul
      const existingImageRegex =
        /!\[.*?\]\((https:\/\/the99\.b-cdn\.net\/notes\/.*?)\)/g;
      const existingImages = [];
      let match;

      while ((match = existingImageRegex.exec(existingContent)) !== null) {
        existingImages.push(match[1]);
      }

      // Yeni içerikteki resimleri bul
      const newImageRegex =
        /!\[.*?\]\((https:\/\/the99\.b-cdn\.net\/notes\/.*?)\)/g;
      const newImages = [];

      while ((match = newImageRegex.exec(content)) !== null) {
        newImages.push(match[1]);
      }

      // Silinmiş resimleri bul
      const deletedImages = existingImages.filter(
        (img) => !newImages.includes(img)
      );

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
            console.error(
              `Resim silinirken hata oluştu: ${imageUrl}`,
              await response.text()
            );
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
    
    // Əgər slug dəyişibsə, içərikdəki köhnə slug-lı URL-ləri yeni slug ilə əvəz et
    if (oldSlug !== newSlug) {
      const oldUrlPattern = new RegExp(`https://the99\\.b-cdn\\.net/notes/${oldSlug}/`, 'g');
      const newUrlPrefix = `https://the99.b-cdn.net/notes/${newSlug}/`;
      processedContent = processedContent.replace(oldUrlPattern, newUrlPrefix);
      console.log(`İçərikdəki URL-lər yeniləndi: ${oldSlug} -> ${newSlug}`);
    }
    
    console.log("Orijinal içerik:", processedContent);
    
    // 1. Markdown formatında resim URL'lerini bul: ![alt](url)
    const markdownImageRegex = /!\[(.*?)\]\(([^)]+)\)/g;
    let markdownMatch;
    const tempImages = [];
    
    // Tüm markdown resimlerini bul
    while ((markdownMatch = markdownImageRegex.exec(processedContent)) !== null) {
      const [fullMatch, alt, src] = markdownMatch;
      
      // Geçici resim URL'lerini tespit et (blob: ile başlayan veya #temp- içeren)
      if (src.startsWith('blob:') || src.includes('#temp-')) {
        tempImages.push({
          fullMatch,
          alt,
          src,
          position: markdownMatch.index
        });
      }
    }
    
    console.log(`${tempImages.length} geçici resim bulundu:`, tempImages);
    
    // 2. Doğrudan blob: URL'leri bul
    const blobUrlRegex = /blob:[^\s"')]+/g;
    let blobMatch;
    
    while ((blobMatch = blobUrlRegex.exec(processedContent)) !== null) {
      const blobUrl = blobMatch[0];
      
      // Zaten markdown içinde bulunmayan blob URL'lerini ekle
      const alreadyProcessed = tempImages.some(img => img.src === blobUrl);
      
      if (!alreadyProcessed) {
        tempImages.push({
          fullMatch: blobUrl,
          alt: '',
          src: blobUrl,
          position: blobMatch.index
        });
      }
    }
    
    // 3. #temp- ID'lerini bul
    const tempIdRegex = /#temp-[0-9]+-[a-z]+/g;
    let tempIdMatch;
    
    while ((tempIdMatch = tempIdRegex.exec(processedContent)) !== null) {
      const tempId = tempIdMatch[0];
      
      // Zaten işlenen temp ID'leri kontrol et
      const alreadyProcessed = tempImages.some(img => img.src.includes(tempId));
      
      if (!alreadyProcessed) {
        tempImages.push({
          fullMatch: tempId,
          alt: '',
          src: `placeholder${tempId}`,
          position: tempIdMatch.index
        });
      }
    }
    
    console.log(`Toplam ${tempImages.length} geçici resim işlenecek`);
    
    // Global resim sayacını başlat
    if (!global._imageCounters) {
      global._imageCounters = {};
    }
    if (!global._imageCounters[newSlug]) {
      // Mevcut resimlerin sayısını bul
      try {
        const folderPath = `notes/${newSlug}/images`;

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
          const imageFiles = files.filter(
            (file: any) =>
              file.ObjectName.startsWith(newSlug) &&
              /\.(jpg|jpeg|png|gif|webp)$/i.test(file.ObjectName)
          );
          global._imageCounters[newSlug] = imageFiles.length;
        } else {
          // Klasör bulunamadıysa veya başka bir hata varsa, sayacı sıfırla
          global._imageCounters[newSlug] = 0;
        }
      } catch (error) {
        console.error("BunnyCDN klasör kontrolü hatası:", error);
        global._imageCounters[newSlug] = 0;
      }
    }

    // Bulunan geçici resimleri işle
    for (const tempImage of tempImages) {
      try {
        // Resim sayacını artır (her post için benzersiz numaralar)
        global._imageCounters[newSlug] += 1;
        
        // Dosya formatını tespit et
        let fileExtension = "png"; // Varsayılan format
        
        // Temp ID'den formatı tespit etmeye çalış
        if (tempImage.src.includes('#temp-')) {
          const tempId = tempImage.src.substring(tempImage.src.indexOf('#temp-'));
          const formatMatch = tempId.match(/temp-[0-9]+-([a-z]+)/);
          if (formatMatch && formatMatch[1]) {
            fileExtension = formatMatch[1];
          }
        } else if (tempImage.src.includes('.')) {
          // Dosya adından formatı tespit et
          const extMatch = tempImage.src.split('.').pop();
          if (extMatch && extMatch.length < 5) { // Makul bir uzantı uzunluğu kontrolü
            fileExtension = extMatch;
          }
        }
        
        // Resim için benzersiz bir ID oluştur veya var olanı kullan
        let imageFileName;
        
        // Önce client'dan gönderilen imageIdMap'te bu resim için bir ID var mı kontrol et
        const tempKey = tempImage.src;
        if (imageIdMap[tempKey]) {
          // Client'dan gönderilen ID'yi kullan
          imageFileName = imageIdMap[tempKey];
          console.log(`API: Client'dan gönderilen resim ID'si kullanılıyor: ${tempKey} -> ${imageFileName}`);
        } else {
          // Yoksa yeni bir ID oluştur
          const { getOrCreateImageId } = await import("../../../utils/image-id-store");
          imageFileName = getOrCreateImageId(tempKey, newSlug, fileExtension);
          console.log(`API: Yeni resim ID'si oluşturuldu: ${tempKey} -> ${imageFileName}`);
        }
        const cdnUrl = `https://the99.b-cdn.net/notes/${newSlug}/images/${imageFileName}`;
        
        console.log(`Geçici resim işleniyor: ${tempImage.src} -> ${cdnUrl}`);
        
        // Markdown formatındaki resimler için
        if (tempImage.fullMatch.startsWith('![')) {
          processedContent = processedContent.replace(
            tempImage.fullMatch, 
            `![${tempImage.alt}](${cdnUrl})`
          );
        } 
        // Doğrudan URL'ler için
        else {
          processedContent = processedContent.replace(tempImage.fullMatch, cdnUrl);
        }
        
        console.log(`Geçici resim URL'si değiştirildi: ${tempImage.fullMatch} -> ${cdnUrl}`);
      } catch (error) {
        console.error(`Resim URL'si düzeltilmedi: ${tempImage.src}`, error);
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

    // Mövcud approved statusunu saxla
    const approvedStatus = entry.data.approved || false;

    const markdown = `---
pubDate: ${pubDate}
author: 
  name: "${authorFullname}"
  avatar: "${authorAvatar}"
title: "${title}"
description: "${description}"
${imageSection}${categoriesSection}
approved: ${approvedStatus}
---

${processedContent}`;

    // Yeni dosyayı yaz
    await fs.writeFile(newFilePath, markdown, "utf-8");
    
    // Əgər slug dəyişibsə, köhnə faylı sil
    if (oldSlug !== newSlug) {
      try {
        await fs.unlink(oldFilePath);
        console.log(`Köhnə fayl silindi: ${oldFileName}`);
      } catch (unlinkError) {
        console.error(`Köhnə fayl silinə bilmədi: ${oldFileName}`, unlinkError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Gönderi başarıyla güncellendi",
        slug: newSlug,
        oldSlug: oldSlug,
        slugChanged: oldSlug !== newSlug,
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
