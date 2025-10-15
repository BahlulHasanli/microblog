import type { APIRoute } from "astro";
import { requireAuth } from "../../../utils/auth";
import { slugify } from "../../../utils/slugify";
import { supabase } from "../../../db/supabase";

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

    // Supabase-dən mövcud postu yoxla
    const { data: existingPost, error: fetchError } = await supabase
      .from("posts")
      .select("*")
      .eq("slug", oldSlug)
      .single();

    if (fetchError || !existingPost) {
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
    const pubDate = existingPost.pub_date;

    // BunnyCDN məlumatları
    const bunnyApiKey = "a3571a42-cb98-4dce-9b81d75e2c8c-5263-4043";
    const storageZoneName = "the99-storage";
    const hostname = "storage.bunnycdn.com";

    // Slug dəyişibsə folder əməliyyatları
    let shouldMoveFolder = oldSlug !== newSlug;
    let oldFolderImages: any[] = [];
    
    if (shouldMoveFolder) {
      console.log(`Slug dəyişdi: ${oldSlug} -> ${newSlug}`);
      
      try {
        const oldFolder = `notes/${oldSlug}/images`;
        
        // Köhnə folder-dəki şəkilləri al
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
          oldFolderImages = await checkOldFolderResponse.json();
          console.log(`Köhnə folder-də ${oldFolderImages.length} fayl tapıldı`);
        } else {
          console.log(`Köhnə folder tapılmadı: ${oldFolder}`);
        }
      } catch (error) {
        console.error("Köhnə folder yoxlanılarkən xəta:", error);
      }
    }

    // ===== ŞƏKİL ƏMƏLİYYATLARI (SLUG DƏYİŞƏNDƏ) =====
    // Slug dəyişibsə: 1) Yeni folder yarat, 2) Köhnə şəkilləri köçür, 3) Yeni şəkli yüklə
    if (shouldMoveFolder) {
      console.log(`\n=== SLUG DƏYİŞDİ - ŞƏKİL ƏMƏLİYYATLARI ===`);
      console.log(`Köhnə slug: ${oldSlug} -> Yeni slug: ${newSlug}`);
      console.log(`Köhnə folder-də ${oldFolderImages.length} fayl var`);
      
      const oldFolder = `notes/${oldSlug}/images`;
      const newFolder = `notes/${newSlug}/images`;
      
      // 1. Yeni folder yarat
      console.log(`\n1️⃣ Yeni folder yaradılır: ${newFolder}`);
      try {
        const createFolderResponse = await fetch(
          `https://${hostname}/${storageZoneName}/${newFolder}/`,
          {
            method: "PUT",
            headers: {
              AccessKey: bunnyApiKey,
            },
          }
        );
        
        if (createFolderResponse.ok || createFolderResponse.status === 201) {
          console.log(`✅ Yeni folder yaradıldı`);
        } else {
          console.error(`❌ Folder yaradıla bilmədi: ${createFolderResponse.status}`);
        }
      } catch (error) {
        console.error(`❌ Folder yaratma xətası:`, error);
      }
      
      // 2. Köhnə şəkilləri köçür (əgər varsa)
      if (oldFolderImages.length > 0) {
        console.log(`\n2️⃣ Köhnə şəkillər köçürülür: ${oldFolderImages.length} fayl`);
        
        for (const file of oldFolderImages) {
          if (!file.IsDirectory) {
            try {
              console.log(`Köçürülür: ${file.ObjectName}`);
              
              // Faylı endir
              const downloadResponse = await fetch(
                `https://${hostname}/${storageZoneName}/${oldFolder}/${file.ObjectName}`,
                {
                  method: "GET",
                  headers: {
                    AccessKey: bunnyApiKey,
                  },
                }
              );
              
              if (!downloadResponse.ok) {
                console.error(`❌ Endirilə bilmədi: ${file.ObjectName} (status: ${downloadResponse.status})`);
                continue;
              }
              
              const fileBuffer = await downloadResponse.arrayBuffer();
              console.log(`Endirildi: ${file.ObjectName} (${fileBuffer.byteLength} bytes)`);
              
              // Fayl adını yenilə - köhnə slug-u yeni slug ilə əvəz et
              let newFileName = file.ObjectName;
              
              // Əgər fayl adı köhnə slug ilə başlayırsa, yeni slug ilə əvəz et
              if (file.ObjectName.startsWith(oldSlug)) {
                newFileName = file.ObjectName.replace(oldSlug, newSlug);
                console.log(`Ad dəyişdirilir: ${file.ObjectName} -> ${newFileName}`);
              } else {
                console.log(`⚠️ Fayl adı köhnə slug ilə başlamır: ${file.ObjectName}`);
              }
              
              console.log(`Yeni ad: ${newFileName}`);
              
              // Yeni folder-ə yüklə
              const uploadResponse = await fetch(
                `https://${hostname}/${storageZoneName}/${newFolder}/${newFileName}`,
                {
                  method: "PUT",
                  headers: {
                    AccessKey: bunnyApiKey,
                    "Content-Type": "application/octet-stream",
                  },
                  body: fileBuffer,
                }
              );
              
              if (uploadResponse.ok || uploadResponse.status === 201) {
                console.log(`✅ Köçürüldü: ${file.ObjectName} -> ${newFileName}`);
              } else {
                console.error(`❌ Yüklənə bilmədi: ${newFileName} (status: ${uploadResponse.status})`);
              }
            } catch (error) {
              console.error(`❌ Xəta (${file.ObjectName}):`, error);
            }
          }
        }
        console.log(`✅ Köhnə şəkillər köçürüldü`);
      } else {
        console.log(`ℹ️ Köhnə folder-də şəkil yoxdur`);
      }
    }
    
    // ===== İNDİ YENİ ŞƏKİL YÜKLƏNİR (ƏGƏR VARSA) =====
    let coverImageUrl = existingImageUrl;
    
    // Əgər slug dəyişibsə və mövcud cover image varsa, URL-i yenilə
    if (oldSlug !== newSlug && coverImageUrl && coverImageUrl.includes(oldSlug)) {
      // Folder path-i yenilə
      coverImageUrl = coverImageUrl.replace(`notes/${oldSlug}/`, `notes/${newSlug}/`);
      
      // Cover image adını yenilə (məsələn: gta6-cover.jpeg -> gta7-cover.jpeg)
      const coverPattern = new RegExp(`/${oldSlug}-cover\\.(jpg|jpeg|png|gif|webp)`, 'i');
      coverImageUrl = coverImageUrl.replace(coverPattern, `/${newSlug}-cover.$1`);
      
      console.log(`Cover image URL və adı yeniləndi: ${coverImageUrl}`);
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
          
          // Əgər slug dəyişməyibsə və ya folder artıq yaradılmayıbsa, folder yoxla və yarat
          if (!shouldMoveFolder) {
            console.log(`Folder yoxlanılır: ${folder}`);
            
            try {
              // Folder yoxla
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
              
              // Əgər folder yoxdursa yarat
              if (checkFolderResponse.status === 404) {
                console.log(`Folder tapılmadı, yaradılır: ${folder}`);
                
                const createFolderResponse = await fetch(
                  `https://${hostname}/${storageZoneName}/${folder}/`,
                  {
                    method: "PUT",
                    headers: {
                      AccessKey: bunnyApiKey,
                    },
                  }
                );
                
                if (createFolderResponse.ok) {
                  console.log(`✅ Folder yaradıldı: ${folder}`);
                } else {
                  console.error(`❌ Folder yaradıla bilmədi: ${createFolderResponse.status}`);
                }
              } else if (checkFolderResponse.ok) {
                console.log(`✅ Folder mövcuddur: ${folder}`);
              }
            } catch (folderError) {
              console.error(`Folder əməliyyatında xəta: ${folderError.message}`);
            }
          } else {
            console.log(`Folder artıq yaradılıb (slug dəyişib), yoxlanılmır`);
          }

          // Fetch API ile yükleme yap
          console.log(`\n📤 Yeni şəkil yüklənir...`);
          console.log(`Fayl yolu: ${filePath}`);
          console.log(`Fayl ölçüsü: ${buffer.length} bytes`);
          console.log(`URL: https://${hostname}/${storageZoneName}/${filePath}`);
          
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

          console.log(`Response status: ${response.status}`);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Bunny CDN yükleme hatası: ${response.status}`);
            console.error(`Xəta detayı: ${errorText}`);
            throw new Error(`Bunny CDN yükleme hatası: ${response.status} - ${response.statusText}`);
          }
          
          console.log(`✅ Yeni şəkil yükləndi: ${filePath}`);

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

    // Editorda silinən şəkilləri BunnyCDN-dən sil
    const deletedImageUrls: string[] = [];
    
    try {
      // Köhnə post məzmununu Supabase-dən al
      const existingContent = existingPost.content;

      // Köhnə məzmundakı şəkilləri tap
      const existingImageRegex = /!\[.*?\]\((https:\/\/the99\.b-cdn\.net\/notes\/.*?)\)/g;
      const existingImages = [];
      let match;

      while ((match = existingImageRegex.exec(existingContent)) !== null) {
        existingImages.push(match[1]);
      }

      // Yeni məzmundakı şəkilləri tap (slug dəyişibsə URL-lər artıq yenilənib)
      const newImageRegex = /!\[.*?\]\((https:\/\/the99\.b-cdn\.net\/notes\/.*?)\)/g;
      const newImages = [];

      while ((match = newImageRegex.exec(content)) !== null) {
        // Əgər slug dəyişibsə, yeni URL-ləri köhnə slug ilə müqayisə etmək üçün geri çevir
        let imageUrl = match[1];
        if (shouldMoveFolder && imageUrl.includes(newSlug)) {
          imageUrl = imageUrl.replace(`notes/${newSlug}/`, `notes/${oldSlug}/`);
        }
        newImages.push(imageUrl);
      }

      // Editorda silinən şəkilləri tap
      const deletedImages = existingImages.filter(
        (img) => !newImages.includes(img)
      );

      // Silinən şəkilləri BunnyCDN-dən sil
      for (const imageUrl of deletedImages) {
        try {
          const cdnPrefix = "https://the99.b-cdn.net/";
          const filePath = imageUrl.replace(cdnPrefix, "");

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
            console.log(`Editorda silinən şəkil BunnyCDN-dən silindi: ${imageUrl}`);
            deletedImageUrls.push(imageUrl);
          } else {
            console.error(`Şəkil silinərkən xəta: ${imageUrl}`, await response.text());
          }
        } catch (error) {
          console.error(`Şəkil silinərkən xəta: ${imageUrl}`, error);
        }
      }
    } catch (error) {
      console.error("Şəkil silmə əməliyyatında xəta:", error);
    }

    // İçerikteki geçici resimleri CDN URL'leriyle değiştir
    let processedContent = content;
    
    // Əgər slug dəyişibsə, içərikdəki köhnə slug-lı URL-ləri yeni slug ilə əvəz et
    if (oldSlug !== newSlug) {
      console.log(`\n=== MƏZMUNDA URL YENİLƏMƏ ===`);
      console.log(`Köhnə slug: ${oldSlug}`);
      console.log(`Yeni slug: ${newSlug}`);
      
      // Köhnə URL pattern: https://the99.b-cdn.net/notes/oldSlug/
      const oldUrlBase = `https://the99.b-cdn.net/notes/${oldSlug}/`;
      const newUrlBase = `https://the99.b-cdn.net/notes/${newSlug}/`;
      
      console.log(`Köhnə URL bazası: ${oldUrlBase}`);
      console.log(`Yeni URL bazası: ${newUrlBase}`);
      
      // Bütün köhnə URL-ləri yeni URL ilə əvəz et
      const urlCount = (processedContent.match(new RegExp(oldUrlBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      console.log(`Məzmunda ${urlCount} köhnə URL tapıldı`);
      
      if (urlCount > 0) {
        // 1. Folder path-ini dəyiş (notes/oldSlug/ -> notes/newSlug/)
        processedContent = processedContent.replaceAll(oldUrlBase, newUrlBase);
        console.log(`✅ Folder path dəyişdirildi`);
        
        // 2. Şəkil adlarını dəyiş
        // Bütün fayl adlarında oldSlug-u newSlug ilə əvəz et
        // Format: oldSlug-XXXXXX.ext -> newSlug-XXXXXX.ext
        // Nümunə: ererererer-52320b87.png -> opopopopopo-52320b87.png
        
        // Escape special regex characters in oldSlug
        const escapedOldSlug = oldSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Pattern: oldSlug-[hər hansı simvollar].[uzantı]
        const imagePattern = new RegExp(`${escapedOldSlug}-([a-zA-Z0-9]+)\\.(jpg|jpeg|png|gif|webp|svg)`, 'gi');
        
        const imageMatches = processedContent.match(imagePattern);
        console.log(`Tapılan şəkil adları:`, imageMatches);
        
        processedContent = processedContent.replace(imagePattern, `${newSlug}-$1.$2`);
        
        console.log(`✅ Məzmunda URL-lər və şəkil adları yeniləndi`);
      } else {
        console.log(`ℹ️ Məzmunda köhnə URL tapılmadı`);
      }
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
        ? `categories: [${categoriesData.map((category) => `"${category}"`).join(", ")}]\n`
        : "";

    // Mövcud approved və featured statusunu saxla
    const approvedStatus = existingPost.approved || false;
    const featuredStatus = existingPost.featured || false;

    // Supabase-də postu yenilə
    const { data: updatedPost, error: updateError } = await supabase
      .from("posts")
      .update({
        slug: newSlug,
        title,
        description,
        content: processedContent,
        pub_date: pubDate,
        image_url: coverImageUrl || existingPost.image_url,
        image_alt: imageAlt || title,
        author_name: authorFullname,
        author_avatar: authorAvatar,
        categories: categoriesData,
        approved: approvedStatus,
        featured: featuredStatus,
        updated_at: new Date().toISOString()
      })
      .eq("slug", oldSlug)
      .select()
      .single();

    if (updateError) {
      console.error("Supabase update xətası:", updateError);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Post yenilənərkən xəta baş verdi: " + updateError.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Post yeniləndi: ${newSlug}`);
    
    // Əgər slug dəyişibsə, köhnə folderi sil
    if (shouldMoveFolder) {
      try {
        const oldFolder = `notes/${oldSlug}/images`;
        
        // Köhnə folder-i tamamilə sil
        console.log(`\n2️⃣ KÖHNƏ FOLDER SİLİNİR`);
        console.log(`Silinəcək folder: notes/${oldSlug}`);
        
        try {
          // BunnyCDN-də folder strukturunu sil: notes/oldSlug/
          // BunnyCDN API folder silmə üçün recursive deyil, ona görə əvvəlcə faylları silməliyik
          
          // 1. images folder-dəki faylları sil
          if (oldFolderImages.length > 0) {
            console.log(`${oldFolderImages.length} fayl silinir...`);
            for (const file of oldFolderImages) {
              if (!file.IsDirectory) {
                const deleteFileResponse = await fetch(
                  `https://${hostname}/${storageZoneName}/${oldFolder}/${file.ObjectName}`,
                  {
                    method: "DELETE",
                    headers: {
                      AccessKey: bunnyApiKey,
                    },
                  }
                );
                console.log(`Fayl silindi: ${file.ObjectName} (status: ${deleteFileResponse.status})`);
              }
            }
          } else {
            console.log(`Köhnə folder-də fayl yoxdur, birbaşa folder silinir`);
          }
          
          // 2. images folder-i sil
          const deleteImagesResponse = await fetch(
            `https://${hostname}/${storageZoneName}/${oldFolder}/`,
            {
              method: "DELETE",
              headers: {
                AccessKey: bunnyApiKey,
              },
            }
          );
          console.log(`images folder silmə statusu: ${deleteImagesResponse.status}`);
          
          // 3. Ana folder-i sil (notes/oldSlug/)
          const deleteParentResponse = await fetch(
            `https://${hostname}/${storageZoneName}/notes/${oldSlug}/`,
            {
              method: "DELETE",
              headers: {
                AccessKey: bunnyApiKey,
              },
            }
          );
          console.log(`Parent folder silmə statusu: ${deleteParentResponse.status}`);
          
          if (deleteParentResponse.ok || deleteParentResponse.status === 404) {
            console.log(`✅ Köhnə folder tamamilə silindi: notes/${oldSlug}`);
          } else {
            console.error(`❌ Parent folder silinə bilmədi: ${deleteParentResponse.status}`);
          }
        } catch (deleteError) {
          console.error(`❌ Köhnə folder silinərkən xəta:`, deleteError);
        }
      } catch (error) {
        console.error("Folder köçürmə əməliyyatında xəta:", error);
      }
    }

    // Response göndər
    return new Response(
      JSON.stringify({
        success: true,
        message: "Gönderi başarıyla güncellendi",
        slug: newSlug,
        oldSlug: oldSlug,
        slugChanged: oldSlug !== newSlug,
        post: updatedPost
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
