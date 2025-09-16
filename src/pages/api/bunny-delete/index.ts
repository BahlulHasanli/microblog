import type { APIRoute } from "astro";
import { requireAuth } from "../../../utils/auth";

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
    const filePath = formData.get("filePath")?.toString();

    if (!filePath) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Dosya yolu belirtilmedi",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error("BunnyCDN silme hatası:", errorText);
      return new Response(
        JSON.stringify({
          success: false,
          message: `Dosya silinirken bir hata oluştu: ${response.statusText}`,
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Dosya başarıyla silindi",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Dosya silme hatası:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: "Dosya silinirken bir hata oluştu",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
