/**
 * CDN resimləri üçün responsive srcset və sizes yaradır
 * wasm-image-optimization istifadə edərək /api/image-optimize endpoint üzərindən optimize edir
 */

export interface ImageOptimizerOptions {
  src: string;
  width?: number;
  height?: number;
  sizes?: string;
  quality?: number;
}

export interface ResponsiveImageResult {
  src: string;
  srcset: string;
  sizes: string;
}

/**
 * Şəkil URL-ni optimize edir - WASM endpoint üzərindən
 * SSR tərəfdə (Astro) relative URL istifadə edilir
 */
export function generateOptimizedUrl(
  src: string,
  width?: number,
  height?: number,
  quality: number = 80,
  format: "webp" | "avif" | "jpeg" | "png" = "webp",
): string {
  if (!src || !src.includes("b-cdn.net")) {
    return src;
  }

  const params = new URLSearchParams();
  params.set("url", src);
  if (width) params.set("w", width.toString());
  if (quality) params.set("q", quality.toString());
  if (format) params.set("f", format);

  return `/api/image-optimize?${params.toString()}`;
}

/**
 * Köhnə funksiya adı ilə geriyə uyğunluq (backward compatibility)
 * generateBunnyCDNUrl -> generateOptimizedUrl
 */
export function generateBunnyCDNUrl(
  src: string,
  width?: number,
  height?: number,
  quality: number = 80,
  format: "webp" | "avif" | "auto" | "jpeg" | "png" = "webp",
): string {
  // "auto" formatı webp-yə çevir
  const actualFormat = format === "auto" ? "webp" : format;
  return generateOptimizedUrl(
    src,
    width,
    height,
    quality,
    actualFormat as "webp" | "avif" | "jpeg" | "png",
  );
}

/**
 * Responsive srcset yaradır
 */
export function generateResponsiveImages(
  options: ImageOptimizerOptions,
): ResponsiveImageResult {
  const { src, width = 800, quality = 80 } = options;

  // CDN dəstəyi yoxdursa, sadəcə original src qaytarırıq
  if (!src || !src.includes("b-cdn.net")) {
    return {
      src,
      srcset: src,
      sizes: "100vw",
    };
  }

  // Daha kiçik ölçülər - real ekran ölçülərinə uyğun
  const widths = [320, 480, 640, 800, 1024, 1280, 1536];
  const applicableWidths = widths.filter((w) => w <= width);

  if (
    applicableWidths.length === 0 ||
    applicableWidths[applicableWidths.length - 1] < width
  ) {
    applicableWidths.push(width);
  }

  const srcsetParts = applicableWidths.map((w) => {
    const optimizedUrl = generateOptimizedUrl(
      src,
      w,
      undefined,
      quality,
      "webp",
    );
    return `${optimizedUrl} ${w}w`;
  });

  // Default sizes - real card ölçülərinə uyğun
  const defaultSizes =
    options.sizes ||
    `
    (max-width: 640px) 100vw,
    (max-width: 768px) 80vw,
    (max-width: 1024px) 1024px,
    1280px
  `
      .trim()
      .replace(/\s+/g, " ");

  return {
    src: generateOptimizedUrl(src, width, undefined, quality, "webp"),
    srcset: srcsetParts.join(", "),
    sizes: defaultSizes,
  };
}

/**
 * Blog entry card üçün optimal sizes
 * Card ölçüləri: mobil ~400px, tablet ~350px, desktop ~300px
 */
export function getBlogEntrySizes(): string {
  return `
    (max-width: 640px) calc(100vw - 32px),
    (max-width: 768px) calc(50vw - 24px),
    (max-width: 1024px) calc(33vw - 20px),
    400px
  `
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Hero/Featured image üçün optimal sizes
 * Hero ölçüləri: mobil 100vw, tablet 100vw, desktop max 1280px
 */
export function getHeroImageSizes(): string {
  return `
    (max-width: 640px) 100vw,
    (max-width: 1024px) 100vw,
    1280px
  `
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Avatar üçün optimal sizes
 * Avatar ölçüləri: mobil 40px, desktop 56px
 */
export function getAvatarSizes(): string {
  return "(max-width: 640px) 40px, 56px";
}

/**
 * Background blur image üçün (çox kiçik ölçü lazımdır)
 */
export function getBlurBackgroundSizes(): string {
  return "200px";
}

/**
 * Sponsor banner üçün optimal sizes
 */
export function getSponsorBannerSizes(): string {
  return `
    (max-width: 640px) calc(100vw - 32px),
    400px
  `
    .trim()
    .replace(/\s+/g, " ");
}
