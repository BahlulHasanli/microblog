import { encode } from "blurhash";

/**
 * Browser-da şəkil faylından blurhash generasiya edir (client-side)
 * Bu funksiya yalnız browser-da işləyir
 * @param file - Şəkil faylı
 * @returns Blurhash string
 */
export async function generateBlurhashFromFile(
  file: File
): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    img.onload = () => {
      // Kiçik ölçüyə resize et (performans üçün)
      const width = 32;
      const height = Math.round((img.height / img.width) * 32);

      canvas.width = width;
      canvas.height = height;

      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);

        try {
          const blurhash = encode(
            imageData.data,
            imageData.width,
            imageData.height,
            4,
            3
          );
          resolve(blurhash);
        } catch (error) {
          console.error("Blurhash encode xətası:", error);
          resolve(null);
        }
      } else {
        resolve(null);
      }

      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      console.error("Şəkil yüklənmədi");
      resolve(null);
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Browser-da URL-dən blurhash generasiya edir (client-side)
 * @param imageUrl - Şəkil URL-i
 * @returns Blurhash string
 */
export async function generateBlurhashFromUrl(
  imageUrl: string
): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    img.onload = () => {
      const width = 32;
      const height = Math.round((img.height / img.width) * 32);

      canvas.width = width;
      canvas.height = height;

      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);

        try {
          const blurhash = encode(
            imageData.data,
            imageData.width,
            imageData.height,
            4,
            3
          );
          resolve(blurhash);
        } catch (error) {
          console.error("Blurhash encode xətası:", error);
          resolve(null);
        }
      } else {
        resolve(null);
      }
    };

    img.onerror = () => {
      console.error("Şəkil yüklənmədi:", imageUrl);
      resolve(null);
    };

    img.src = imageUrl;
  });
}
