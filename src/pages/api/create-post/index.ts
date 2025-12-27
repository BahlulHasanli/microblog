import type { APIRoute } from "astro";
import { requireAuth } from "@/utils/auth";
import { slugify } from "@/utils/slugify";
import { supabase } from "@/db/supabase";
import { slugifyCategory } from "@/utils/slugify-category";

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
    const description = formData.get("description")?.toString() || "";
    const content = formData.get("content")?.toString() || "";

    const categoriesRaw = formData
      .getAll("categories")
      .map((c) => c.toString());

    const categoriesData = [
      ...new Set(
        categoriesRaw.flatMap((category) =>
          category.includes(",")
            ? category.split(",").map((c) => slugifyCategory(c.trim()))
            : [slugifyCategory(category.trim())]
        )
      ),
    ].filter(Boolean);

    const imageAltFromForm = formData.get("imageAlt")?.toString();

    const uploadedImage = formData.get("uploadedImage") as File | null;
    const imageBlurhash = formData.get("imageBlurhash")?.toString() || null;

    const imageAlt =
      imageAltFromForm && imageAltFromForm.trim() !== ""
        ? imageAltFromForm
        : "";

    if (!title || !content) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Başlıq və mətn boş olmalı deyil",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (categoriesData.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Ən azı bir kateqoriya seçilməlidir",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const pubDate = new Date().toISOString();

    const slug = slugify(title);

    let coverImageUrl = "";

    if (uploadedImage) {
      try {
        const fileExtension = uploadedImage.name.split(".").pop() || "jpg";
        const imageFileName = `${slug}-cover.${fileExtension}`;

        const folder = `posts/${slug}/images`;

        try {
          const arrayBuffer = await uploadedImage.arrayBuffer();

          const runtime = (context.locals as any).runtime;
          const bunnyApiKey =
            runtime?.env?.BUNNY_API_KEY || import.meta.env.BUNNY_API_KEY;
          const storageZoneName =
            runtime?.env?.BUNNY_STORAGE_ZONE ||
            import.meta.env.BUNNY_STORAGE_ZONE;

          if (!bunnyApiKey) {
            throw new Error("BUNNY_API_KEY environment variable tapılmadı");
          }

          const filePath = `${folder}/${imageFileName}`;

          const response = await fetch(
            `https://storage.bunnycdn.com/${storageZoneName}/${filePath}`,
            {
              method: "PUT",
              headers: {
                AccessKey: bunnyApiKey,
                "Content-Type": "application/octet-stream",
              },
              body: arrayBuffer,
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `Bunny CDN yükleme hatası: ${response.status} ${response.statusText} - ${errorText}`
            );
          }

          coverImageUrl = `https://the99.b-cdn.net/${folder}/${imageFileName}`;
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

    let processedContent = content;

    const blobUrlRegex =
      /blob:http:\/\/localhost:4321\/[a-zA-Z0-9-]+#temp-[0-9]+-[a-z]+/g;
    const blobUrls = content.match(blobUrlRegex) || [];

    // Resim sayacını başlat (lokal variable)
    let imageCounter = 0;

    for (const blobUrl of blobUrls) {
      try {
        // Temp ID'yi al
        const tempId = blobUrl.split("#")[1];

        if (!tempId) continue;

        // Resim sayacını artır (her post için benzersiz numaralar)
        imageCounter += 1;

        // Dosya formatını tespit et
        // Blob URL'den format bilgisini çıkar
        // Temp ID'den format bilgisini al (temp-123-png gibi)
        const formatMatch = tempId.match(/temp-[0-9]+-([a-z]+)/);
        const fileExtension =
          formatMatch && formatMatch[1] ? formatMatch[1] : "png";

        // Resim adını oluştur: slug-1.png formatında (tiptap-utils.ts ile tutarlı)
        const imageFileName = `${slug}-${imageCounter}.${fileExtension}`;
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
        author_id: user.id,
        image_url: coverImageUrl || null,
        image_alt: imageAlt || title,
        image_blurhash: imageBlurhash,
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
