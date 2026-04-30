import type { APIRoute } from "astro";
import { requireAuth } from "@/utils/auth";
import { slugify } from "@/utils/slugify";
import { supabase } from "@/db/supabase";
import { optimizeImage } from "wasm-image-optimization";

export const POST: APIRoute = async (context) => {
  try {
    // Kimlik doğrulama kontrolü
    const user = await requireAuth(context);

    if (user instanceof Response) {
      return user;
    }

    // Form verilerini al
    const formData = await context.request.formData();
    const oldSlug = formData.get("slug")?.toString() || "";
    const title = formData.get("title")?.toString() || "";

    // Yeni slug yaradırıq (başlıq dəyişibsə)
    const newSlug = slugify(title);

    const description = formData.get("description") as string;
    const content = formData.get("content") as string;
    // Kategorileri al ve virgülle ayrılmış stringleri ayır
    const categoriesRaw = formData
      .getAll("categories")
      .map((c) => c.toString());

    // Virgülle ayrılmış kategorileri ayır ve tekrar eden kategorileri kaldır
    const categoriesData = [
      ...new Set(
        categoriesRaw.flatMap((category) =>
          category.includes(",")
            ? category.split(",").map((c) => c.trim())
            : [category.trim()],
        ),
      ),
    ].filter(Boolean);
    const existingImageUrl = formData.get("existingImageUrl") as string;
    const imageAlt = (formData.get("imageAlt") as string) || title;
    const uploadedImage = formData.get("uploadedImage") as File;

    // Musiqi məlumatları
    const audioFileRaw = formData.get("audioFile");
    const audioFile =
      audioFileRaw instanceof File && audioFileRaw.size > 0
        ? audioFileRaw
        : null;
    const audioTitle = formData.get("audioTitle")?.toString() || "";
    const audioArtist = formData.get("audioArtist")?.toString() || "";
    const existingAudioUrl = formData.get("existingAudioUrl")?.toString() || "";
    const removeAudio = formData.get("removeAudio") === "true";

    console.log("Audio məlumatları:", {
      audioFileRaw: audioFileRaw,
      audioFileType: audioFileRaw ? typeof audioFileRaw : null,
      audioFileSize: audioFile?.size,
      audioTitle,
      audioArtist,
      existingAudioUrl,
      removeAudio,
    });

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
        },
      );
    }

    if (categoriesData.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Ən azı bir bölmə seçilməlidir",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
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
          message: "Post tapılmadı",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Orijinal yayın tarihini koru
    const pubDate = existingPost.pub_date;

    // BunnyCDN məlumatları
    const bunnyApiKey = import.meta.env.BUNNY_API_KEY;
    const storageZoneName = import.meta.env.BUNNY_STORAGE_ZONE;

    // Slug dəyişibsə folder əməliyyatları
    let shouldMoveFolder = oldSlug !== newSlug;
    let oldFolderImages: any[] = [];
    let oldFolderAudio: any[] = [];

    if (shouldMoveFolder) {
      console.log(`Slug dəyişdi: ${oldSlug} -> ${newSlug}`);

      try {
        // Köhnə images folder-dəki faylları al
        const oldImagesFolder = `posts/${oldSlug}/images`;
        const checkOldImagesFolderResponse = await fetch(
          `https://storage.bunnycdn.com/${storageZoneName}/${oldImagesFolder}/`,
          {
            method: "GET",
            headers: {
              AccessKey: bunnyApiKey,
              Accept: "application/json",
            },
          },
        );

        if (checkOldImagesFolderResponse.ok) {
          oldFolderImages = await checkOldImagesFolderResponse.json();
          console.log(
            `Köhnə images folder-də ${oldFolderImages.length} fayl tapıldı`,
          );
        } else {
          console.log(`Köhnə images folder tapılmadı: ${oldImagesFolder}`);
        }

        // Köhnə audio folder-dəki faylları al
        const oldAudioFolder = `posts/${oldSlug}/audio`;
        const checkOldAudioFolderResponse = await fetch(
          `https://storage.bunnycdn.com/${storageZoneName}/${oldAudioFolder}/`,
          {
            method: "GET",
            headers: {
              AccessKey: bunnyApiKey,
              Accept: "application/json",
            },
          },
        );

        if (checkOldAudioFolderResponse.ok) {
          oldFolderAudio = await checkOldAudioFolderResponse.json();
          console.log(
            `Köhnə audio folder-də ${oldFolderAudio.length} fayl tapıldı`,
          );
        } else {
          console.log(`Köhnə audio folder tapılmadı: ${oldAudioFolder}`);
        }
      } catch (error) {
        console.error("Köhnə folder yoxlanılarkən xəta:", error);
      }
    }

    // ===== FOLDER ƏMƏLİYYATLARI (SLUG DƏYİŞƏNDƏ) =====
    // Slug dəyişibsə: 1) Yeni folderləri yarat, 2) Köhnə faylları köçür
    if (shouldMoveFolder) {
      console.log(`\n=== SLUG DƏYİŞDİ - FOLDER ƏMƏLİYYATLARI ===`);
      console.log(`Köhnə slug: ${oldSlug} -> Yeni slug: ${newSlug}`);

      const oldImagesFolder = `posts/${oldSlug}/images`;
      const newImagesFolder = `posts/${newSlug}/images`;
      const oldAudioFolder = `posts/${oldSlug}/audio`;
      const newAudioFolder = `posts/${newSlug}/audio`;

      // 1. Yeni images folder yarat
      console.log(`\n1️⃣ Yeni images folder yaradılır: ${newImagesFolder}`);
      try {
        const createFolderResponse = await fetch(
          `https://storage.bunnycdn.com/${storageZoneName}/${newImagesFolder}/`,
          {
            method: "PUT",
            headers: {
              AccessKey: bunnyApiKey,
            },
          },
        );

        if (createFolderResponse.ok || createFolderResponse.status === 201) {
          console.log(`✅ Yeni images folder yaradıldı`);
        } else {
          console.error(
            `❌ Images folder yaradıla bilmədi: ${createFolderResponse.status}`,
          );
        }
      } catch (error) {
        console.error(`❌ Images folder yaratma xətası:`, error);
      }

      // 2. Köhnə şəkilləri köçür (əgər varsa)
      if (oldFolderImages.length > 0) {
        console.log(
          `\n2️⃣ Köhnə şəkillər köçürülür: ${oldFolderImages.length} fayl`,
        );

        for (const file of oldFolderImages) {
          if (!file.IsDirectory) {
            try {
              console.log(`Köçürülür: ${file.ObjectName}`);

              const downloadResponse = await fetch(
                `https://storage.bunnycdn.com/${storageZoneName}/${oldImagesFolder}/${file.ObjectName}`,
                {
                  method: "GET",
                  headers: {
                    AccessKey: bunnyApiKey,
                  },
                },
              );

              if (!downloadResponse.ok) {
                console.error(
                  `❌ Endirilə bilmədi: ${file.ObjectName} (status: ${downloadResponse.status})`,
                );
                continue;
              }

              const fileBuffer = await downloadResponse.arrayBuffer();
              console.log(
                `Endirildi: ${file.ObjectName} (${fileBuffer.byteLength} bytes)`,
              );

              // Fayl adını yenilə - köhnə slug-u yeni slug ilə əvəz et
              let newFileName = file.ObjectName;
              if (file.ObjectName.startsWith(oldSlug)) {
                newFileName = file.ObjectName.replace(oldSlug, newSlug);
                console.log(
                  `Ad dəyişdirilir: ${file.ObjectName} -> ${newFileName}`,
                );
              }

              // Yeni folder-ə yüklə
              const uploadResponse = await fetch(
                `https://storage.bunnycdn.com/${storageZoneName}/${newImagesFolder}/${newFileName}`,
                {
                  method: "PUT",
                  headers: {
                    AccessKey: bunnyApiKey,
                    "Content-Type": "application/octet-stream",
                  },
                  body: fileBuffer,
                },
              );

              if (uploadResponse.ok || uploadResponse.status === 201) {
                console.log(
                  `✅ Köçürüldü: ${file.ObjectName} -> ${newFileName}`,
                );
              } else {
                console.error(
                  `❌ Yüklənə bilmədi: ${newFileName} (status: ${uploadResponse.status})`,
                );
              }
            } catch (error) {
              console.error(`❌ Xəta (${file.ObjectName}):`, error);
            }
          }
        }
        console.log(`✅ Köhnə şəkillər köçürüldü`);
      } else {
        console.log(`ℹ️ Köhnə images folder-də şəkil yoxdur`);
      }

      // 3. Yeni audio folder yarat və köhnə audio fayllarını köçür
      if (oldFolderAudio.length > 0) {
        console.log(
          `\n3️⃣ Audio fayllar köçürülür: ${oldFolderAudio.length} fayl`,
        );

        try {
          const createAudioFolderResponse = await fetch(
            `https://storage.bunnycdn.com/${storageZoneName}/${newAudioFolder}/`,
            {
              method: "PUT",
              headers: {
                AccessKey: bunnyApiKey,
              },
            },
          );

          if (
            createAudioFolderResponse.ok ||
            createAudioFolderResponse.status === 201
          ) {
            console.log(`✅ Yeni audio folder yaradıldı`);
          }
        } catch (error) {
          console.error(`❌ Audio folder yaratma xətası:`, error);
        }

        for (const file of oldFolderAudio) {
          if (!file.IsDirectory) {
            try {
              const downloadResponse = await fetch(
                `https://storage.bunnycdn.com/${storageZoneName}/${oldAudioFolder}/${file.ObjectName}`,
                {
                  method: "GET",
                  headers: {
                    AccessKey: bunnyApiKey,
                  },
                },
              );

              if (!downloadResponse.ok) {
                console.error(
                  `❌ Audio endirilə bilmədi: ${file.ObjectName} (status: ${downloadResponse.status})`,
                );
                continue;
              }

              const fileBuffer = await downloadResponse.arrayBuffer();

              let newFileName = file.ObjectName;
              if (file.ObjectName.startsWith(oldSlug)) {
                newFileName = file.ObjectName.replace(oldSlug, newSlug);
              }

              const uploadResponse = await fetch(
                `https://storage.bunnycdn.com/${storageZoneName}/${newAudioFolder}/${newFileName}`,
                {
                  method: "PUT",
                  headers: {
                    AccessKey: bunnyApiKey,
                    "Content-Type": "application/octet-stream",
                  },
                  body: fileBuffer,
                },
              );

              if (uploadResponse.ok || uploadResponse.status === 201) {
                console.log(
                  `✅ Audio köçürüldü: ${file.ObjectName} -> ${newFileName}`,
                );
              } else {
                console.error(
                  `❌ Audio yüklənə bilmədi: ${newFileName} (status: ${uploadResponse.status})`,
                );
              }
            } catch (error) {
              console.error(`❌ Audio xəta (${file.ObjectName}):`, error);
            }
          }
        }
        console.log(`✅ Audio fayllar köçürüldü`);
      } else {
        console.log(`ℹ️ Köhnə audio folder-də fayl yoxdur`);
      }
    }

    // ===== İNDİ YENİ ŞƏKİL YÜKLƏNİR (ƏGƏR VARSA) =====
    let coverImageUrl = existingImageUrl || existingPost.image_url || "";

    // Əgər slug dəyişibsə və mövcud cover image varsa, URL-i yenilə
    if (
      oldSlug !== newSlug &&
      coverImageUrl &&
      coverImageUrl.includes(oldSlug)
    ) {
      // Folder path-i yenilə
      coverImageUrl = coverImageUrl.replace(
        `posts/${oldSlug}/`,
        `posts/${newSlug}/`,
      );

      // Cover image adındakı oldSlug hissəsini newSlug ilə əvəz et
      const escapedOldSlug = oldSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const coverPattern = new RegExp(
        `/${escapedOldSlug}-([a-zA-Z0-9_-]+)\\.(jpg|jpeg|png|gif|webp)`,
        "i",
      );
      coverImageUrl = coverImageUrl.replace(coverPattern, `/${newSlug}-$1.$2`);

      console.log(`Cover image URL və adı yeniləndi: ${coverImageUrl}`);
    }
    if (uploadedImage) {
      try {
        let originalExtension = (
          uploadedImage.name.split(".").pop() || ""
        ).toLowerCase();

        let mimeType = uploadedImage.type || "";

        // Uzantı və ya mime-type əsasında convert edilə biləcəyini yoxlayaq
        const isConvertible =
          ["png", "jpg", "jpeg"].includes(originalExtension) ||
          ["image/png", "image/jpeg", "image/jpg"].includes(mimeType);

        // Əgər extension yoxdursa, amma MimeType uyğundursa, standart extension təyin edək
        if (
          !originalExtension ||
          originalExtension === uploadedImage.name.toLowerCase()
        ) {
          if (mimeType === "image/png") originalExtension = "png";
          else if (mimeType === "image/jpeg" || mimeType === "image/jpg")
            originalExtension = "jpg";
          else originalExtension = "jpg"; // fallback
        }

        let finalExtension = originalExtension;

        // Bunny CDN klasör yapısı - içerik resimleriyle aynı klasörü kullan
        const folder = `posts/${newSlug}/images`;

        try {
          // Resim dosyasının içeriğini al
          const arrayBuffer = await uploadedImage.arrayBuffer();

          let uploadBuffer: ArrayBuffer | Uint8Array = arrayBuffer;

          // Əgər format PNG, JPG və ya JPEG-dirsə, WebP-yə çevir
          if (isConvertible) {
            try {
              console.log(
                `Cover şəkil WebP-yə çevrilir (orijinal: ${originalExtension}, type: ${mimeType}, ölçü: ${arrayBuffer.byteLength} bytes)`,
              );
              const webpImage = await optimizeImage({
                image: arrayBuffer,
                quality: 95,
                format: "webp",
              });
              uploadBuffer = webpImage;
              finalExtension = "webp"; // Yalnız uğurlu olduqda webp edirik
              console.log(
                `WebP-yə çevrildi (yeni ölçü: ${webpImage.byteLength} bytes, qənaət: ${Math.round((1 - webpImage.byteLength / arrayBuffer.byteLength) * 100)}%)`,
              );
            } catch (convertError: any) {
              console.error(
                `WebP çevirmə xətası, orijinal format ilə yüklənir:`,
                convertError,
              );
              uploadBuffer = arrayBuffer;
              finalExtension = originalExtension;
            }
          }

          // Random ad generasiya et cover şəkil üçün
          const randomId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
          const imageFileName = `${newSlug}-cover-${randomId}.${finalExtension}`;

          console.log("Bunny CDN klasör yapısı:", folder);
          console.log("Resim dosya adı (random):", imageFileName);

          // Tam dosya yolu
          const filePath = `${folder}/${imageFileName}`;

          // Köhnə cover şəkli BunnyCDN-dən sil
          const oldCoverUrl = existingPost.image_url;
          if (oldCoverUrl && oldCoverUrl.includes("the99.b-cdn.net")) {
            try {
              const oldCoverPath = oldCoverUrl.replace(
                "https://the99.b-cdn.net/",
                "",
              );
              console.log(`Köhnə cover silinir: ${oldCoverPath}`);

              const deleteOldCoverResponse = await fetch(
                `https://storage.bunnycdn.com/${storageZoneName}/${oldCoverPath}`,
                {
                  method: "DELETE",
                  headers: {
                    AccessKey: bunnyApiKey,
                  },
                },
              );

              if (deleteOldCoverResponse.ok) {
                console.log(`✅ Köhnə cover silindi: ${oldCoverPath}`);
              } else {
                console.error(
                  `❌ Köhnə cover silinə bilmədi: ${deleteOldCoverResponse.status}`,
                );
              }

              // Köhnə cover-in cache-ini purge et
              const purgeOldResponse = await fetch(
                `https://api.bunny.net/purge?url=${encodeURIComponent(oldCoverUrl)}`,
                {
                  method: "POST",
                  headers: {
                    AccessKey: bunnyApiKey,
                  },
                },
              );
              if (purgeOldResponse.ok) {
                console.log(`✅ Köhnə cover cache purge edildi`);
              }
            } catch (deleteError) {
              console.error(`Köhnə cover silmə xətası:`, deleteError);
            }
          }

          // Əgər slug dəyişməyibsə və ya folder artıq yaradılmayıbsa, folder yoxla və yarat
          if (!shouldMoveFolder) {
            console.log(`Folder yoxlanılır: ${folder}`);

            try {
              const checkFolderResponse = await fetch(
                `https://storage.bunnycdn.com/${storageZoneName}/${folder}/`,
                {
                  method: "GET",
                  headers: {
                    AccessKey: bunnyApiKey,
                    Accept: "application/json",
                  },
                },
              );

              if (checkFolderResponse.status === 404) {
                console.log(`Folder tapılmadı, yaradılır: ${folder}`);

                const createFolderResponse = await fetch(
                  `https://storage.bunnycdn.com/${storageZoneName}/${folder}/`,
                  {
                    method: "PUT",
                    headers: {
                      AccessKey: bunnyApiKey,
                    },
                  },
                );

                if (createFolderResponse.ok) {
                  console.log(`✅ Folder yaradıldı: ${folder}`);
                } else {
                  console.error(
                    `❌ Folder yaradıla bilmədi: ${createFolderResponse.status}`,
                  );
                }
              } else if (checkFolderResponse.ok) {
                console.log(`✅ Folder mövcuddur: ${folder}`);
              }
            } catch (folderError: any) {
              console.error(
                `Folder əməliyyatında xəta: ${folderError.message}`,
              );
            }
          } else {
            console.log(`Folder artıq yaradılıb (slug dəyişib), yoxlanılmır`);
          }

          // Fetch API ile yükleme yap
          console.log(`\n📤 Yeni şəkil yüklənir...`);
          console.log(`Fayl yolu: ${filePath}`);
          console.log(`Fayl ölçüsü: ${uploadBuffer.byteLength} bytes`);
          console.log(
            `URL: https://storage.bunnycdn.com/${storageZoneName}/${filePath}`,
          );

          const response = await fetch(
            `https://storage.bunnycdn.com/${storageZoneName}/${filePath}`,
            {
              method: "PUT",
              headers: {
                AccessKey: bunnyApiKey,
                "Content-Type": "application/octet-stream",
              },
              body: uploadBuffer as BodyInit,
            },
          );

          console.log(`Response status: ${response.status}`);

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Bunny CDN yükləmə xətası: ${response.status}`);
            console.error(`Xəta: ${errorText}`);
            throw new Error(
              `Bunny CDN yükləmə xətası: ${response.status} - ${response.statusText}`,
            );
          }

          console.log(`✅ Yeni şəkil yükləndi: ${filePath}`);

          // Başarılı yükleme sonrası CDN URL'sini oluştur
          coverImageUrl = `https://the99.b-cdn.net/${folder}/${imageFileName}`;
          console.log("Bunny CDN'e yüklendi, URL:", coverImageUrl);

          // Cache purge - yeni şəkli cache-dən sil
          try {
            const purgeUrl = `https://the99.b-cdn.net/${folder}/${imageFileName}`;
            console.log(`Cache purge edilir: ${purgeUrl}`);

            const purgeResponse = await fetch(
              `https://api.bunny.net/purge?url=${encodeURIComponent(purgeUrl)}`,
              {
                method: "POST",
                headers: {
                  AccessKey: bunnyApiKey,
                },
              },
            );

            if (purgeResponse.ok) {
              console.log(`✅ Cache purge edildi: ${purgeUrl}`);
            } else {
              console.error(`❌ Cache purge xətası: ${purgeResponse.status}`);
            }
          } catch (purgeError) {
            console.error(`Cache purge xətası:`, purgeError);
          }
        } catch (uploadError) {
          throw new Error(`Bunny CDN yükleme hatası: ${uploadError.message}`);
        }
      } catch (error) {
        return new Response(
          JSON.stringify({
            success: false,
            message: `Resim yükleme sırasında bir hata oluştu: ${error.message}`,
          }),
          { status: 500 },
        );
      }
    }

    // Musiqi faylını BunnyCDN-ə yüklə və ya sil
    let audioUrl = existingAudioUrl || existingPost.audio_url || "";
    let audioTitleFinal = audioTitle || existingPost.audio_title || "";
    let audioArtistFinal = audioArtist || existingPost.audio_artist || "";

    // Audio silmə
    if (removeAudio && existingPost.audio_url) {
      console.log("Audio silmə başladı:", existingPost.audio_url);
      try {
        // BunnyCDN-dən audio faylını sil
        const audioUrlPath = existingPost.audio_url.replace(
          "https://the99.b-cdn.net/",
          "",
        );
        const deleteAudioResponse = await fetch(
          `https://storage.bunnycdn.com/${storageZoneName}/${audioUrlPath}`,
          {
            method: "DELETE",
            headers: {
              AccessKey: bunnyApiKey,
            },
          },
        );

        if (deleteAudioResponse.ok) {
          console.log("Audio BunnyCDN-dən silindi:", audioUrlPath);
        } else {
          console.error(
            "Audio silmə xətası:",
            await deleteAudioResponse.text(),
          );
        }
      } catch (deleteError) {
        console.error("Audio silmə xətası:", deleteError);
      }

      // Audio məlumatlarını sıfırla
      audioUrl = "";
      audioTitleFinal = "";
      audioArtistFinal = "";
    } else if (audioFile && audioFile.size > 0) {
      try {
        const audioFileName = `${newSlug}-audio.mp3`;
        const audioFolder = `posts/${newSlug}/audio`;

        const audioArrayBuffer = await audioFile.arrayBuffer();

        const audioFilePath = `${audioFolder}/${audioFileName}`;

        const audioResponse = await fetch(
          `https://storage.bunnycdn.com/${storageZoneName}/${audioFilePath}`,
          {
            method: "PUT",
            headers: {
              AccessKey: bunnyApiKey,
              "Content-Type": "application/octet-stream",
            },
            body: audioArrayBuffer,
          },
        );

        if (!audioResponse.ok) {
          const errorText = await audioResponse.text();
          console.error(
            `Bunny CDN audio yükləmə xətası: ${audioResponse.status} ${audioResponse.statusText} - ${errorText}`,
          );
        } else {
          audioUrl = `https://the99.b-cdn.net/${audioFolder}/${audioFileName}`;
          console.log("Musiqi faylı BunnyCDN-ə yükləndi:", audioUrl);
        }
      } catch (audioError: any) {
        console.error("Musiqi yükləmə xətası:", audioError);
      }
    }

    // Content-dəki audio tag-ı silinibsə, BunnyCDN-dən də sil
    // Köhnə post content-ində audio varmı yoxla
    const existingContentHasAudio = existingPost.content.includes("<audio");
    const newContentHasAudio = content.includes("<audio");

    // Əgər köhnə content-də audio var idi amma yeni content-də yoxdur
    // Bu, database audio_url-dən fərqlidir - content-dəki embedded audio-dur
    if (existingContentHasAudio && !newContentHasAudio) {
      console.log("Content-dəki audio tag silindi");

      // Content-dəki audio src-ni tap: <audio controls src="URL"...>
      const audioSrcMatch = existingPost.content.match(
        /<audio[^>]+src=["']([^"']+)["']/,
      );
      if (audioSrcMatch && audioSrcMatch[1]) {
        const contentAudioUrl = audioSrcMatch[1];
        console.log("Content-dən audio URL extract edildi:", contentAudioUrl);

        // Bu URL database audio_url-dən fərqlidirsə sil
        // Əgər eyni URL-dirsə, removeAudio flag-i ilə artıq silinib
        if (
          contentAudioUrl.includes("the99.b-cdn.net") &&
          contentAudioUrl !== existingPost.audio_url
        ) {
          console.log("Content audio BunnyCDN-dən silinir:", contentAudioUrl);
          try {
            const audioUrlPath = contentAudioUrl.replace(
              "https://the99.b-cdn.net/",
              "",
            );
            const deleteAudioResponse = await fetch(
              `https://storage.bunnycdn.com/${storageZoneName}/${audioUrlPath}`,
              {
                method: "DELETE",
                headers: {
                  AccessKey: bunnyApiKey,
                },
              },
            );

            if (deleteAudioResponse.ok) {
              console.log("Content audio BunnyCDN-dən silindi:", audioUrlPath);
            } else {
              console.error(
                "Content audio silmə xətası:",
                await deleteAudioResponse.text(),
              );
            }
          } catch (deleteError) {
            console.error("Content audio silmə xətası:", deleteError);
          }
        } else if (contentAudioUrl === existingPost.audio_url) {
          console.log(
            "Content audio URL database audio_url ilə eynidir, removeAudio ilə idarə olunur",
          );
        }
      }
    }

    // Editorda silinən şəkilləri BunnyCDN-dən sil
    const deletedImageUrls: string[] = [];

    try {
      // Köhnə post məzmununu Supabase-dən al
      const existingContent = existingPost.content;

      // Köhnə məzmundakı şəkilləri tap
      const existingImageRegex =
        /!\[.*?\]\((https:\/\/the99\.b-cdn\.net\/posts\/.*?)\)/g;

      const existingImages = [];

      let match: any;

      while ((match = existingImageRegex.exec(existingContent)) !== null) {
        existingImages.push(match[1]);
      }

      // Yeni məzmundakı şəkilləri tap (slug dəyişibsə URL-lər artıq yenilənib)
      const newImageRegex =
        /!\[.*?\]\((https:\/\/the99\.b-cdn\.net\/posts\/.*?)\)/g;
      const newImages = [];

      while ((match = newImageRegex.exec(content)) !== null) {
        // Əgər slug dəyişibsə, yeni URL-ləri köhnə slug ilə müqayisə etmək üçün geri çevir
        let imageUrl = match[1];
        if (shouldMoveFolder && imageUrl.includes(newSlug)) {
          imageUrl = imageUrl.replace(`posts/${newSlug}/`, `posts/${oldSlug}/`);
        }
        newImages.push(imageUrl);
      }

      // Editorda silinən şəkilləri tap
      const deletedImages = existingImages.filter(
        (img) => !newImages.includes(img),
      );

      // Silinən şəkilləri BunnyCDN-dən sil
      for (const imageUrl of deletedImages) {
        try {
          const cdnPrefix = "https://the99.b-cdn.net/";
          const filePath = imageUrl.replace(cdnPrefix, "");

          const response = await fetch(
            `https://storage.bunnycdn.com/${storageZoneName}/${filePath}`,
            {
              method: "DELETE",
              headers: {
                AccessKey: bunnyApiKey,
              },
            },
          );

          if (response.ok) {
            console.log(
              `Editorda silinən şəkil BunnyCDN-dən silindi: ${imageUrl}`,
            );
            deletedImageUrls.push(imageUrl);
          } else {
            console.error(
              `Şəkil silinərkən xəta: ${imageUrl}`,
              await response.text(),
            );
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

      // Köhnə URL pattern: https://the99.b-cdn.net/posts/oldSlug/
      const oldUrlBase = `https://the99.b-cdn.net/posts/${oldSlug}/`;
      const newUrlBase = `https://the99.b-cdn.net/posts/${newSlug}/`;

      console.log(`Köhnə URL bazası: ${oldUrlBase}`);
      console.log(`Yeni URL bazası: ${newUrlBase}`);

      // Bütün köhnə URL-ləri yeni URL ilə əvəz et
      const urlCount = (
        processedContent.match(
          new RegExp(oldUrlBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        ) || []
      ).length;
      console.log(`Məzmunda ${urlCount} köhnə URL tapıldı`);

      if (urlCount > 0) {
        // 1. Folder path-ini dəyiş (posts/oldSlug/ -> posts/newSlug/)
        processedContent = processedContent.replaceAll(oldUrlBase, newUrlBase);
        console.log(`✅ Folder path dəyişdirildi`);

        // 2. Şəkil adlarını dəyiş
        // Bütün fayl adlarında oldSlug-u newSlug ilə əvəz et
        // Format: oldSlug-XXXXXX.ext -> newSlug-XXXXXX.ext
        // Nümunə: ererererer-52320b87.png -> opopopopopo-52320b87.png

        // Escape special regex characters in oldSlug
        const escapedOldSlug = oldSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        // Pattern: oldSlug-[hər hansı simvollar].[uzantı]
        const imagePattern = new RegExp(
          `${escapedOldSlug}-([a-zA-Z0-9]+)\\.(jpg|jpeg|png|gif|webp|svg)`,
          "gi",
        );

        const imageMatches = processedContent.match(imagePattern);
        console.log(`Tapılan şəkil adları:`, imageMatches);

        processedContent = processedContent.replace(
          imagePattern,
          `${newSlug}-$1.$2`,
        );

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
    while (
      (markdownMatch = markdownImageRegex.exec(processedContent)) !== null
    ) {
      const [fullMatch, alt, src] = markdownMatch;

      // Geçici resim URL'lerini tespit et (blob: ile başlayan veya #temp- içeren)
      if (src.startsWith("blob:") || src.includes("#temp-")) {
        tempImages.push({
          fullMatch,
          alt,
          src,
          position: markdownMatch.index,
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
      const alreadyProcessed = tempImages.some((img) => img.src === blobUrl);

      if (!alreadyProcessed) {
        tempImages.push({
          fullMatch: blobUrl,
          alt: "",
          src: blobUrl,
          position: blobMatch.index,
        });
      }
    }

    // 3. #temp- ID'lerini bul
    const tempIdRegex = /#temp-[0-9]+-[a-z]+/g;
    let tempIdMatch: any;

    while ((tempIdMatch = tempIdRegex.exec(processedContent)) !== null) {
      const tempId = tempIdMatch[0];

      // Zaten işlenen temp ID'leri kontrol et
      const alreadyProcessed = tempImages.some((img) =>
        img.src.includes(tempId),
      );

      if (!alreadyProcessed) {
        tempImages.push({
          fullMatch: tempId,
          alt: "",
          src: `placeholder${tempId}`,
          position: tempIdMatch.index,
        });
      }
    }

    console.log(`Toplam ${tempImages.length} geçici resim işlenecek`);

    // Resim sayacını başlat (lokal variable)
    let imageCounter = 0;

    // Mevcut resimlerin sayısını bul
    try {
      const folderPath = `posts/${newSlug}/images`;

      // Klasör içeriğini kontrol et
      const response = await fetch(
        `https://storage.bunnycdn.com/${storageZoneName}/${folderPath}/`,
        {
          method: "GET",
          headers: {
            AccessKey: bunnyApiKey,
            Accept: "application/json",
          },
        },
      );

      if (response.ok) {
        const files = await response.json();
        // Slug ile başlayan ve .jpg, .png, .gif vb. uzantılı dosyaları say
        const imageFiles = files.filter(
          (file: any) =>
            file.ObjectName.startsWith(newSlug) &&
            /\.(jpg|jpeg|png|gif|webp)$/i.test(file.ObjectName),
        );
        imageCounter = imageFiles.length;
      } else {
        // Klasör bulunamadıysa veya başka bir hata varsa, sayacı sıfırla
        imageCounter = 0;
      }
    } catch (error) {
      console.error("BunnyCDN klasör kontrolü hatası:", error);
      imageCounter = 0;
    }

    // Bulunan geçici resimleri işle
    for (const tempImage of tempImages) {
      try {
        // Resim sayacını artır (her post için benzersiz numaralar)
        imageCounter += 1;

        // Dosya formatını tespit et
        let fileExtension = "png"; // Varsayılan format

        // Temp ID'den formatı tespit etmeye çalış
        if (tempImage.src.includes("#temp-")) {
          const tempId = tempImage.src.substring(
            tempImage.src.indexOf("#temp-"),
          );
          const formatMatch = tempId.match(/temp-[0-9]+-([a-z]+)/);
          if (formatMatch && formatMatch[1]) {
            fileExtension = formatMatch[1];
          }
        } else if (tempImage.src.includes(".")) {
          // Dosya adından formatı tespit et
          const extMatch = tempImage.src.split(".").pop();
          if (extMatch && extMatch.length < 5) {
            // Makul bir uzantı uzunluğu kontrolü
            fileExtension = extMatch;
          }
        }

        // Resim için benzersiz bir ID oluştur veya var olanı kullan
        let imageFileName: any;

        // Önce client'dan gönderilen imageIdMap'te bu resim için bir ID var mı kontrol et
        const tempKey = tempImage.src;

        if (imageIdMap[tempKey]) {
          // Client'dan gönderilen ID'yi kullan
          imageFileName = imageIdMap[tempKey];
        } else {
          // Yoksa yeni bir ID oluştur
          const { getOrCreateImageId } =
            await import("../../../utils/image-id-store");
          imageFileName = getOrCreateImageId(tempKey, newSlug, fileExtension);
        }
        const cdnUrl = `https://the99.b-cdn.net/posts/${newSlug}/images/${imageFileName}`;

        // Markdown formatındaki resimler için
        if (tempImage.fullMatch.startsWith("![")) {
          processedContent = processedContent.replace(
            tempImage.fullMatch,
            `![${tempImage.alt}](${cdnUrl})`,
          );
        }
        // Doğrudan URL'ler için
        else {
          processedContent = processedContent.replace(
            tempImage.fullMatch,
            cdnUrl,
          );
        }
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
        ? `categories: [${categoriesData
            .map((category) => `"${category}"`)
            .join(", ")}]\n`
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
        author_id: user.id,
        image_url: coverImageUrl || existingPost.image_url,
        image_alt: imageAlt || title,
        categories: categoriesData,
        approved: approvedStatus,
        featured: featuredStatus,
        updated_at: new Date().toISOString(),
        // Musiqi məlumatları - silindisə null, yoxsa mövcud dəyər
        audio_url: removeAudio ? null : audioUrl || null,
        audio_title: removeAudio ? null : audioTitleFinal || null,
        audio_artist: removeAudio ? null : audioArtistFinal || null,
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
        },
      );
    }

    console.log(`Post yeniləndi: ${newSlug}`);

    // Əgər slug dəyişibsə, köhnə folderi sil
    if (shouldMoveFolder) {
      try {
        const oldImagesPath = `posts/${oldSlug}/images`;
        const oldAudioPath = `posts/${oldSlug}/audio`;

        console.log(`\n🗑️ KÖHNƏ FOLDER SİLİNİR`);
        console.log(`Silinəcək folder: posts/${oldSlug}`);

        try {
          // 1. images folder-dəki faylları sil
          if (oldFolderImages.length > 0) {
            console.log(`${oldFolderImages.length} şəkil faylı silinir...`);
            for (const file of oldFolderImages) {
              if (!file.IsDirectory) {
                const deleteFileResponse = await fetch(
                  `https://storage.bunnycdn.com/${storageZoneName}/${oldImagesPath}/${file.ObjectName}`,
                  {
                    method: "DELETE",
                    headers: {
                      AccessKey: bunnyApiKey,
                    },
                  },
                );
                console.log(
                  `Şəkil silindi: ${file.ObjectName} (status: ${deleteFileResponse.status})`,
                );
              }
            }
          }

          // 2. audio folder-dəki faylları sil
          if (oldFolderAudio.length > 0) {
            console.log(`${oldFolderAudio.length} audio faylı silinir...`);
            for (const file of oldFolderAudio) {
              if (!file.IsDirectory) {
                const deleteFileResponse = await fetch(
                  `https://storage.bunnycdn.com/${storageZoneName}/${oldAudioPath}/${file.ObjectName}`,
                  {
                    method: "DELETE",
                    headers: {
                      AccessKey: bunnyApiKey,
                    },
                  },
                );
                console.log(
                  `Audio silindi: ${file.ObjectName} (status: ${deleteFileResponse.status})`,
                );
              }
            }
          }

          // 3. images folder-i sil
          const deleteImagesResponse = await fetch(
            `https://storage.bunnycdn.com/${storageZoneName}/${oldImagesPath}/`,
            {
              method: "DELETE",
              headers: {
                AccessKey: bunnyApiKey,
              },
            },
          );
          console.log(
            `images folder silmə statusu: ${deleteImagesResponse.status}`,
          );

          // 4. audio folder-i sil
          const deleteAudioResponse = await fetch(
            `https://storage.bunnycdn.com/${storageZoneName}/${oldAudioPath}/`,
            {
              method: "DELETE",
              headers: {
                AccessKey: bunnyApiKey,
              },
            },
          );
          console.log(
            `audio folder silmə statusu: ${deleteAudioResponse.status}`,
          );

          // 5. Ana folder-i sil (posts/oldSlug/)
          const deleteParentResponse = await fetch(
            `https://storage.bunnycdn.com/${storageZoneName}/posts/${oldSlug}/`,
            {
              method: "DELETE",
              headers: {
                AccessKey: bunnyApiKey,
              },
            },
          );
          console.log(
            `Parent folder silmə statusu: ${deleteParentResponse.status}`,
          );

          if (deleteParentResponse.ok || deleteParentResponse.status === 404) {
            console.log(`✅ Köhnə folder tamamilə silindi: posts/${oldSlug}`);
          } else {
            console.error(
              `❌ Parent folder silinə bilmədi: ${deleteParentResponse.status}`,
            );
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
        post: updatedPost,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Post güncelleme hatası:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return new Response(
      JSON.stringify({
        success: false,
        message: `Gönderi güncellenirken bir hata oluştu: ${errorMessage}`,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
