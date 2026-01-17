/**
 * CDN resimləri üçün responsive srcset və sizes yaradır
 * b-cdn.net bunnycdn istifadə edir və query parametrləri ilə optimize edir
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
 * BunnyCDN üçün resim URL-ni optimize edir
 */
export function generateBunnyCDNUrl(
  src: string,
  width?: number,
  height?: number,
  quality: number = 80,
  format: "webp" | "avif" | "auto" = "webp",
): string {
  if (!src.includes("b-cdn.net")) {
    return src;
  }

  const url = new URL(src);
  const params = new URLSearchParams(url.search);

  if (width) {
    params.set("width", width.toString());
  }
  if (height) {
    params.set("height", height.toString());
  }
  params.set("quality", quality.toString());

  // WebP formatına çevir (daha kiçik fayl ölçüsü)
  if (format !== "auto") {
    params.set("format", format);
  }

  // Aspect ratio yalnız hər ikisi varsa
  if (width && height) {
    params.set("aspect_ratio", `${width}:${height}`);
  }

  return `${url.origin}${url.pathname}?${params.toString()}`;
}

/**
 * Responsive srcset yaradır
 */
export function generateResponsiveImages(
  options: ImageOptimizerOptions,
): ResponsiveImageResult {
  const { src, width = 800, quality = 80 } = options;

  // CDN dəstəyi yoxdursa, sadəcə original src qaytarırıq
  if (!src.includes("b-cdn.net")) {
    return {
      src,
      srcset: src,
      sizes: "100vw",
    };
  }

  // Daha kiçik ölçülər - real ekran ölçülərinə uyğun
  const widths = [320, 480, 640, 800, 1024];
  const applicableWidths = widths.filter((w) => w <= width);

  if (
    applicableWidths.length === 0 ||
    applicableWidths[applicableWidths.length - 1] < width
  ) {
    applicableWidths.push(width);
  }

  const srcsetParts = applicableWidths.map((w) => {
    const optimizedUrl = generateBunnyCDNUrl(
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
    (max-width: 768px) 50vw,
    (max-width: 1024px) 33vw,
    400px
  `
      .trim()
      .replace(/\s+/g, " ");

  return {
    src: generateBunnyCDNUrl(src, width, undefined, quality, "webp"),
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
 * Hero ölçüləri: mobil 100vw, tablet 80vw, desktop max 800px
 */
export function getHeroImageSizes(): string {
  return `
    (max-width: 640px) 100vw,
    (max-width: 1024px) 80vw,
    800px
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
