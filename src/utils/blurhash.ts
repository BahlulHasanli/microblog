import { encode } from "blurhash";

/**
 * Şəkil üçün blurhash generasiya edir
 * @param imageBuffer - Şəkil buffer-i (ArrayBuffer)
 * @param width - Şəkil eni
 * @param height - Şəkil hündürlüyü
 * @returns Blurhash string
 */
export async function generateBlurhash(
  imageBuffer: ArrayBuffer
): Promise<string | null> {
  try {
    // Sharp istifadə edərək şəkili kiçik ölçüyə gətiririk (performans üçün)
    const sharp = (await import("sharp")).default;

    const image = sharp(Buffer.from(imageBuffer));
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      console.error("Şəkil metadata-sı alınmadı");
      return null;
    }

    // Kiçik ölçüyə resize et (blurhash üçün böyük şəkil lazım deyil)
    const resizedWidth = 32;
    const resizedHeight = Math.round((metadata.height / metadata.width) * 32);

    const { data, info } = await image
      .resize(resizedWidth, resizedHeight, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Blurhash encode et
    const blurhash = encode(
      new Uint8ClampedArray(data),
      info.width,
      info.height,
      4, // componentX
      3 // componentY
    );

    return blurhash;
  } catch (error) {
    console.error("Blurhash generasiya xətası:", error);
    return null;
  }
}

/**
 * URL-dən şəkil yükləyib blurhash generasiya edir
 * @param imageUrl - Şəkil URL-i
 * @returns Blurhash string
 */
export async function generateBlurhashFromUrl(
  imageUrl: string
): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error("Şəkil yüklənmədi:", response.status);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    return generateBlurhash(arrayBuffer);
  } catch (error) {
    console.error("URL-dən blurhash generasiya xətası:", error);
    return null;
  }
}
