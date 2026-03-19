import { encode, decode } from "blurhash";

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

/**
 * Blurhash-ı kiçik BMP data URL-ə çevirir (instant placeholder üçün)
 */
export function blurhashToDataURL(hash: string | null | undefined, w: number = 4, h: number = 3): string {
  if (!hash) return '';
  try {
    const pixels = decode(hash, w, h);
    const rowSize = Math.ceil(w * 3 / 4) * 4;
    const pixelDataSize = rowSize * h;
    const fileSize = 54 + pixelDataSize;
    const buffer = new Uint8Array(fileSize);
    const view = new DataView(buffer.buffer);
    buffer[0] = 0x42; buffer[1] = 0x4D;
    view.setUint32(2, fileSize, true);
    view.setUint32(10, 54, true);
    view.setUint32(14, 40, true);
    view.setInt32(18, w, true);
    view.setInt32(22, -h, true);
    view.setUint16(26, 1, true);
    view.setUint16(28, 24, true);
    view.setUint32(30, 0, true);
    view.setUint32(34, pixelDataSize, true);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const si = (y * w + x) * 4;
        const di = 54 + y * rowSize + x * 3;
        buffer[di] = pixels[si + 2];
        buffer[di + 1] = pixels[si + 1];
        buffer[di + 2] = pixels[si];
      }
    }
    let binary = '';
    for (let i = 0; i < buffer.length; i++) binary += String.fromCharCode(buffer[i]);
    return `data:image/bmp;base64,${btoa(binary)}`;
  } catch { return ''; }
}

/**
 * Tarix formatlaması — "Yan 15, 2026" formatı
 */
export function formatSimpleDate(date: string | Date): string {
  const d = new Date(date);
  const months = [
    'Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn',
    'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'
  ];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
