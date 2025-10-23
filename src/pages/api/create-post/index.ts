import type { APIRoute } from "astro";
import { requireAuth } from "../../../utils/auth";
import { slugify } from "../../../utils/slugify";
import { supabase } from "../../../db/supabase";

// Global resim sayacı tanımı
declare global {
  var _imageCounters: Record<string, number>;
}

export const POST: APIRoute = async (context) => {
  try {
    // Kimlik doğrulama kontrolü
    const user = await requireAuth(context);

    if (user instanceof Response) {
      return user;
    }

    // Form verilerini al
    const formData = await context.request.formData();
    const title = formData.get("title")?.toString() || "";
    const authorFullname: any =
      formData.get("author.fullname")?.toString() || "";
    const authorAvatar: any = formData.get("author.avatar")?.toString() || "";
    const description = formData.get("description")?.toString() || "";
    const content = formData.get("content")?.toString() || "";
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
            : [category.trim()]
        )
      ),
    ].filter(Boolean);
    // Resim URL'si ve alt metni için varsayılan değerler
    const imageAltFromForm = formData.get("imageAlt")?.toString();

    // Yüklenen resim dosyasını al
    const uploadedImage = formData.get("uploadedImage") as File | null;

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
    const pubDate = new Date().toISOString();

    // Slug oluştur
    const slug = slugify(title);

    // Eğer yüklenen bir resim varsa, Bunny CDN'e yükle
    let coverImageUrl = "";
    if (uploadedImage) {
      try {
        // Resim dosyasının adını oluştur - içerik resimleriyle aynı format
        const fileExtension = uploadedImage.name.split(".").pop() || "jpg";
        const imageFileName = `${slug}-cover.${fileExtension}`;

        // Bunny CDN klasör yapısı - içerik resimleriyle aynı klasörü kullan
        const folder = `posts/${slug}/images`;

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
    } else {
      console.log("Yüklenen resim yok");
    }

    // İçerikteki geçici resimleri CDN URL'leriyle değiştir
    let processedContent = content;

    // Blob URL'lerini bul ve değiştir - format bilgisini de içeren regex
    const blobUrlRegex =
      /blob:http:\/\/localhost:4321\/[a-zA-Z0-9-]+#temp-[0-9]+-[a-z]+/g;
    const blobUrls = content.match(blobUrlRegex) || [];

    for (const blobUrl of blobUrls) {
      try {
        // Temp ID'yi al
        const tempId = blobUrl.split("#")[1];

        if (!tempId) continue;

        // Resim sayacını artır (her post için benzersiz numaralar)
        // Global bir sayacı kullan
        if (!global._imageCounters) {
          global._imageCounters = {};
        }
        if (!global._imageCounters[slug]) {
          global._imageCounters[slug] = 0;
        }
        global._imageCounters[slug] += 1;

        // Dosya formatını tespit et
        // Blob URL'den format bilgisini çıkar
        // Temp ID'den format bilgisini al (temp-123-png gibi)
        const formatMatch = tempId.match(/temp-[0-9]+-([a-z]+)/);
        const fileExtension =
          formatMatch && formatMatch[1] ? formatMatch[1] : "png";

        // Resim adını oluştur: slug-1.png formatında (tiptap-utils.ts ile tutarlı)
        const imageFileName = `${slug}-${global._imageCounters[slug]}.${fileExtension}`;
        const cdnUrl = `https://the99.b-cdn.net/posts/${slug}/images/${imageFileName}`;

        // İçerikteki URL'yi değiştir
        processedContent = processedContent.replace(blobUrl, cdnUrl);

        console.log(
          `Geçici resim URL'si değiştirildi: ${blobUrl} -> ${cdnUrl}`
        );
      } catch (error) {
        console.error(`Resim URL'si düzeltilemedi: ${blobUrl}`, error);
      }
    }

    // Supabase-ə post əlavə et
    const { data: newPost, error: insertError } = await supabase
      .from("posts")
      .insert({
        slug,
        title,
        description,
        content: processedContent,
        pub_date: pubDate,
        author_email: user.email,
        image_url: coverImageUrl || null,
        image_alt: imageAlt || title,
        categories: categoriesData,
        approved: false,
        featured: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Supabase insert xətası:", insertError);
      return new Response(
        JSON.stringify({
          success: false,
          message:
            "Post əlavə edilərkən xəta baş verdi: " + insertError.message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Gönderi başarıyla oluşturuldu və admin təsdiqi gözləyir",
        slug,
        post: newPost,
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
