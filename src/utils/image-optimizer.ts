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
  quality: number = 85
): string {
  if (!src.includes('b-cdn.net')) {
    return src;
  }

  const url = new URL(src);
  const params = new URLSearchParams(url.search);

  if (width) {
    params.set('width', width.toString());
  }
  if (height) {
    params.set('height', height.toString());
  }
  params.set('quality', quality.toString());
  params.set('aspect_ratio', width && height ? `${width}:${height}` : '');

  return `${url.origin}${url.pathname}?${params.toString()}`;
}

/**
 * Responsive srcset yaradır
 */
export function generateResponsiveImages(
  options: ImageOptimizerOptions
): ResponsiveImageResult {
  const { src, width = 1200, quality = 85 } = options;

  // CDN dəstəyi yoxdursa, sadəcə original src qaytarırıq
  if (!src.includes('b-cdn.net')) {
    return {
      src,
      srcset: src,
      sizes: '100vw',
    };
  }

  // Müxtəlif ölçülər üçün srcset
  const widths = [320, 640, 768, 1024, 1280, 1536];
  const applicableWidths = widths.filter((w) => w <= width);

  if (applicableWidths.length === 0 || applicableWidths[applicableWidths.length - 1] < width) {
    applicableWidths.push(width);
  }

  const srcsetParts = applicableWidths.map((w) => {
    const optimizedUrl = generateBunnyCDNUrl(src, w, undefined, quality);
    return `${optimizedUrl} ${w}w`;
  });

  // Default sizes - müştəri lazım olduqda override edə bilər
  const defaultSizes = options.sizes || `
    (max-width: 640px) 100vw,
    (max-width: 768px) 640px,
    (max-width: 1024px) 768px,
    1024px
  `.trim().replace(/\s+/g, ' ');

  return {
    src: generateBunnyCDNUrl(src, width, undefined, quality),
    srcset: srcsetParts.join(', '),
    sizes: defaultSizes,
  };
}

/**
 * Blog entry card üçün optimal sizes
 */
export function getBlogEntrySizes(): string {
  return `
    (max-width: 640px) 100vw,
    (max-width: 768px) 50vw,
    (max-width: 1024px) 33vw,
    25vw
  `.trim().replace(/\s+/g, ' ');
}

/**
 * Hero/Featured image üçün optimal sizes
 */
export function getHeroImageSizes(): string {
  return `
    (max-width: 640px) 100vw,
    (max-width: 1024px) 80vw,
    1200px
  `.trim().replace(/\s+/g, ' ');
}

/**
 * Avatar üçün optimal sizes
 */
export function getAvatarSizes(): string {
  return '(max-width: 640px) 80px, 120px';
}
