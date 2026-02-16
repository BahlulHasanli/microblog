import { decode } from "blurhash";

/**
 * Blurhash-ı kiçik BMP data URL-ə çevirir.
 * Server-side (Cloudflare Workers) və client-side-da işləyir.
 * Şəkil yüklənənə qədər instant placeholder kimi istifadə olunur.
 *
 * 4x3 piksellik BMP ≈ 100 bytes, base64 ≈ ~150 chars.
 * HTML-ə inline olunur, heç bir JS gözlənilmədən göstərilir.
 */
export function blurhashToDataURL(
  hash: string | null | undefined,
  width: number = 4,
  height: number = 3,
): string {
  if (!hash) return "";

  try {
    const pixels = decode(hash, width, height);

    // BMP faylı yaradılır (ən sadə şəkil formatı, bütün brauzerlər dəstəkləyir)
    const rowSize = Math.ceil((width * 3) / 4) * 4; // Hər sətir 4 byte-a yuvarlaqlanmalıdır
    const pixelDataSize = rowSize * height;
    const fileSize = 54 + pixelDataSize; // 14 (file header) + 40 (DIB header) + pixel data

    const buffer = new Uint8Array(fileSize);
    const view = new DataView(buffer.buffer);

    // BMP File Header (14 bytes)
    buffer[0] = 0x42; // 'B'
    buffer[1] = 0x4d; // 'M'
    view.setUint32(2, fileSize, true); // File size
    view.setUint32(10, 54, true); // Pixel data offset

    // DIB Header — BITMAPINFOHEADER (40 bytes)
    view.setUint32(14, 40, true); // Header size
    view.setInt32(18, width, true); // Width
    view.setInt32(22, -height, true); // Height (mənfi = top-down sıralama)
    view.setUint16(26, 1, true); // Color planes
    view.setUint16(28, 24, true); // Bits per pixel (24 = RGB)
    view.setUint32(30, 0, true); // Compression (BI_RGB — sıxılma yoxdur)
    view.setUint32(34, pixelDataSize, true); // Image data size

    // Pixel data (BGR format, hər sətir 4 byte-a padded)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4; // RGBA
        const dstIdx = 54 + y * rowSize + x * 3; // BGR
        buffer[dstIdx] = pixels[srcIdx + 2]; // Blue
        buffer[dstIdx + 1] = pixels[srcIdx + 1]; // Green
        buffer[dstIdx + 2] = pixels[srcIdx]; // Red
      }
    }

    // Binary to base64
    let binary = "";
    for (let i = 0; i < buffer.length; i++) {
      binary += String.fromCharCode(buffer[i]);
    }

    return `data:image/bmp;base64,${btoa(binary)}`;
  } catch {
    return "";
  }
}
